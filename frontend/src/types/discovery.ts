import { IBooth, IImageAsset } from '../types';

/** Discovery-specific booth contract; image is optional because existing records may not have one. */
export interface IDiscoveryBooth extends IBooth {
    image?: IImageAsset;
}
