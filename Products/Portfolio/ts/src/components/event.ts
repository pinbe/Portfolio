import {InSituViewer} from "./insitu_viewer";
import {PhotoOrderOptionsChangedEventDetail} from "photoprint/src/components/event";

export const PHOTO_LOADED_EVENT = 'PHOTO_LOADED_EVENT';

export interface PhotoLoadedEventDetail {
    cmf_uid: string;
    buyable: boolean;
    selectedOrderOptions: PhotoOrderOptionsChangedEventDetail;
}