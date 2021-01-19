import {IImageOptions} from "fabric/fabric-impl";

export interface Imagelike {
    setSrc(src: string, callback?: Function, options?: IImageOptions): Imagelike;
}