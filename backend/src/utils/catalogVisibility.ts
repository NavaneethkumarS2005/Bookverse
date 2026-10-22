import Publisher from '../models/Publisher';

export const publicPublisherFilter = () => ({
  applicationStatus: { $in: ['approved', null] },
  isActive: { $ne: false },
});

export const publicBoothFilter = async () => {
  const publishers = await Publisher.find(publicPublisherFilter()).select('_id').lean();
  return {
    $or: [
      { publisherId: { $exists: false } },
      { publisherId: null },
      { publisherId: { $in: publishers.map(publisher => publisher._id) } },
    ],
  };
};

export const publicBookFilter = async (base: Record<string, unknown> = {}) => {
  const publishers = await Publisher.find(publicPublisherFilter()).select('_id').lean();
  const visiblePublisherIds = publishers.map(publisher => publisher._id);

  return {
    $and: [
      base,
      {
        $or: [
          { publicationStatus: 'approved' },
          { publicationStatus: { $exists: false } },
        ],
      },
      {
        $or: [
          { publisherId: { $exists: false } },
          { publisherId: null },
          { publisherId: { $in: visiblePublisherIds } },
        ],
      },
    ],
  };
};