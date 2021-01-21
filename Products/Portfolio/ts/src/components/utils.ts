import {fabric} from "fabric";

export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export function getObjSize(obj: fabric.Object): Size {
    const size = {
        width: obj.width,
        height: obj.height
    };
    const shadow = <fabric.Shadow>obj.shadow;

    if (shadow !== null) {
        const scaleX = (shadow.nonScaling) ? 1 : obj.scaleX;
        const scaleY = (shadow.nonScaling) ? 1 : obj.scaleY;

        const blur = shadow.blur;
        const mBlur = blur * Math.abs(scaleX + scaleY);
        const signX = shadow.offsetX >= 0.0 ? 1.0 : -1.0;
        const signY = shadow.offsetY >= 0.0 ? 1.0 : -1.0;
        const mOffsetX = shadow.offsetX * Math.abs((shadow.nonScaling) ? 1 : scaleX);
        const mOffsetY = shadow.offsetY * Math.abs((shadow.nonScaling) ? 1 : scaleY);
        const offsetX = mOffsetX + (signX * mBlur);
        const offsetY = mOffsetY + (signY * mBlur);

        if (mOffsetX > mBlur) {
            size.width += offsetX;
        } else if (mOffsetX < -mBlur) {
            size.width -= offsetX;
            ;
        } else {
            size.width += mBlur * 2;
        }

        if (mOffsetY > mBlur) {
            size.height += offsetY;
        } else if (mOffsetY < -mBlur) {
            size.height -= offsetY;
        } else {
            size.height += mBlur * 2;
        }
    }

    return size;
}
