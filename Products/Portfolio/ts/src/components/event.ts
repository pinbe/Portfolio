import {Point, Size} from "./utils";


export interface InSituBackgroundEventDetail {
    /**
     * background image url
     */
    url: string;
    /**
     * Native image size in pixels
     */
    fullSize: Size;
    /**
     * top left corner of in situ frame, expressed in pixels
     */
    tl: Point;
    /**
     * bottom right corner of in situ frame
     */
    br: Point;
    /**
     * Real world frame width, delimited by top left and bottom right corners,
     * expressed in meters
     */
    frameWidth: number;
    /**
     * Foreground image size in real world, expressed in meters
     */
    fgPaperSize: Size;
}
