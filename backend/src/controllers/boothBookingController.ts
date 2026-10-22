import crypto from 'crypto';
import { Response } from 'express';
import mongoose from 'mongoose';
import BookFair from '../models/BookFair';
import Booth from '../models/Booth';
import BoothBooking from '../models/BoothBooking';
import Publisher from '../models/Publisher';
import { AuthRequest } from '../types';

const getOwnedPublisher = (userId: string) => {
    const query = Publisher.findOne({ ownerId: userId });
    return typeof query.select === 'function' ? query.select('+ownerId') : query;
};

const releaseReservedBooth = async (boothId: unknown, bookingReference: string) => Booth.updateOne(
    { _id: boothId, status: 'RESERVED', bookingReference },
    {
        $set: { status: 'AVAILABLE', isBooked: false },
        $unset: { bookingDate: 1, bookingReference: 1 },
    },
);

export const requestBoothBooking = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher || publisher.applicationStatus !== 'approved' || publisher.isActive === false) {
        return res.status(403).json({ message: 'An active, approved publisher account is required to request a stall.' });
    }
    const boothId = String(req.body?.boothId || '');
    if (!mongoose.isValidObjectId(boothId)) return res.status(400).json({ message: 'A valid boothId is required.' });

    const boothDetails = await Booth.findById(boothId).select('fairId price');
    if (!boothDetails) return res.status(404).json({ message: 'Stall not found.' });
    const now = new Date();
    const fair = await BookFair.findOne({
        _id: boothDetails.fairId,
        status: { $in: ['UPCOMING', 'ONGOING'] },
        endDate: { $gte: now },
        isVirtual: { $ne: true },
    }).select('_id');
    if (!fair) return res.status(409).json({ message: 'Stall requests are available only for upcoming or ongoing in-person fairs.' });
    if (typeof boothDetails.price !== 'number' || !Number.isFinite(boothDetails.price) || boothDetails.price < 0) {
        return res.status(409).json({ message: 'This stall has no configured booking price and cannot be requested yet.' });
    }

    const bookingReference = `EXPO_${crypto.randomUUID().replace(/-/g, '')}`;
    const claimedBooth = await Booth.findOneAndUpdate(
        {
            _id: boothId,
            fairId: fair._id,
            status: 'AVAILABLE',
            isBooked: { $ne: true },
            price: boothDetails.price,
            $or: [{ publisherId: { $exists: false } }, { publisherId: null }],
        },
        { $set: { status: 'RESERVED', isBooked: true, bookingDate: now, bookingReference } },
        { new: true },
    );
    if (!claimedBooth) return res.status(409).json({ message: 'This stall is no longer available.' });

    try {
        const booking = await BoothBooking.create({
            boothId: claimedBooth._id,
            fairId: fair._id,
            publisherId: publisher._id,
            bookingReference,
            quotedPrice: claimedBooth.price,
            currency: 'INR',
            status: 'pending',
            isActive: true,
            paymentStatus: 'not_integrated',
        });
        return res.status(201).json({
            message: 'Stall request submitted for admin review. No payment has been collected.',
            booking,
        });
    } catch (error: any) {
        await releaseReservedBooth(claimedBooth._id, bookingReference);
        if (error?.code === 11000) return res.status(409).json({ message: 'A request for this stall is already active.' });
        throw error;
    }
};

export const listMyBoothBookings = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.json([]);
    const bookings = await BoothBooking.find({ publisherId: publisher._id })
        .populate('fairId', 'name startDate endDate location status')
        .populate('boothId', 'boothNumber section floor size price status')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    res.json(bookings);
};

export const cancelMyBoothBooking = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.status(404).json({ message: 'Booking not found.' });
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Booking not found.' });

    const booking = await BoothBooking.findOneAndUpdate(
        { _id: req.params.id, publisherId: publisher._id, status: 'pending', isActive: true },
        { $set: { status: 'cancelled', isActive: false, cancelledAt: new Date() } },
        { new: true },
    );
    if (!booking) {
        const ownedBooking = await BoothBooking.exists({ _id: req.params.id, publisherId: publisher._id });
        return res.status(ownedBooking ? 409 : 404).json({ message: ownedBooking ? 'Only pending stall requests can be cancelled.' : 'Booking not found.' });
    }

    const releaseResult = await releaseReservedBooth(booking.boothId, booking.bookingReference);
    if (releaseResult.modifiedCount !== 1) {
        return res.status(409).json({ message: 'The request was cancelled, but its stall reservation needs administrator attention.' });
    }
    return res.json({ message: 'Stall request cancelled. No payment was collected.', booking });
};

export const listBoothBookingsForAdmin = async (req: AuthRequest, res: Response) => {
    const status = String(req.query.status || 'pending');
    if (!['pending', 'approved', 'rejected', 'cancelled', 'all'].includes(status)) {
        return res.status(400).json({ message: 'Status must be pending, approved, rejected, cancelled, or all.' });
    }
    const query = status === 'all' ? {} : { status };
    const bookings = await BoothBooking.find(query)
        .populate('publisherId', 'name contactEmail')
        .populate('fairId', 'name startDate endDate location')
        .populate('boothId', 'boothNumber section floor size price status')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    res.json(bookings);
};

export const reviewBoothBooking = async (req: AuthRequest, res: Response) => {
    const nextStatus = req.body?.status;
    if (!['approved', 'rejected'].includes(nextStatus)) {
        return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }
    const rejectionReason = typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    if (nextStatus === 'rejected' && (!rejectionReason || rejectionReason.length > 500)) {
        return res.status(400).json({ message: 'Provide a rejection reason of at most 500 characters.' });
    }
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Booking not found.' });

    const booking = await BoothBooking.findOne({ _id: req.params.id, status: 'pending', isActive: true });
    if (!booking) return res.status(404).json({ message: 'Pending booking not found.' });

    if (nextStatus === 'approved') {
        const publisher = await Publisher.findOne({ _id: booking.publisherId, applicationStatus: 'approved', isActive: { $ne: false } }).select('_id');
        if (!publisher) return res.status(409).json({ message: 'The publisher must remain active and approved to approve this request.' });
        const fair = await BookFair.findOne({
            _id: booking.fairId,
            status: { $in: ['UPCOMING', 'ONGOING'] },
            endDate: { $gte: new Date() },
            isVirtual: { $ne: true },
        }).select('_id');
        if (!fair) return res.status(409).json({ message: 'The fair is no longer eligible for a stall booking approval.' });
        const booth = await Booth.findOne({ _id: booking.boothId, fairId: booking.fairId, status: 'RESERVED', bookingReference: booking.bookingReference }).select('_id');
        if (!booth) return res.status(409).json({ message: 'The reserved stall no longer matches this booking.' });
    }

    const reviewedBooking = await BoothBooking.findOneAndUpdate(
        { _id: booking._id, status: 'pending', isActive: true },
        { $set: {
            status: nextStatus,
            isActive: nextStatus === 'approved',
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
            rejectionReason: nextStatus === 'rejected' ? rejectionReason : undefined,
        } },
        { new: true, runValidators: true },
    );
    if (!reviewedBooking) return res.status(409).json({ message: 'This booking was already reviewed.' });

    if (nextStatus === 'approved') {
        const bookedBooth = await Booth.findOneAndUpdate(
            { _id: booking.boothId, status: 'RESERVED', bookingReference: booking.bookingReference },
            { $set: { status: 'BOOKED', isBooked: true, publisherId: booking.publisherId } },
            { new: true },
        );
        if (!bookedBooth) {
            await BoothBooking.updateOne({ _id: booking._id, status: 'approved' }, { $set: { status: 'pending', isActive: true }, $unset: { reviewedBy: 1, reviewedAt: 1 } });
            return res.status(409).json({ message: 'The stall could not be finalized; the request remains pending.' });
        }
        return res.json({ message: 'Stall booking approved. Payment remains not integrated; no payment has been collected.', booking: reviewedBooking });
    }

    const releaseResult = await releaseReservedBooth(booking.boothId, booking.bookingReference);
    if (releaseResult.modifiedCount !== 1) {
        return res.status(409).json({ message: 'The request was rejected, but its stall reservation needs administrator attention.', booking: reviewedBooking });
    }
    return res.json({ message: 'Stall request rejected; the stall is available again.', booking: reviewedBooking });
};