import {Lightbox} from "./components/lightbox";
import * as $ from "jquery";
import {DDImageUploader} from "./components/ddimgupload";

function main() {
    const lightboxWrapper = document.querySelector<HTMLDivElement>('.lightbox');
    const options = JSON.parse(lightboxWrapper.getAttribute('data-lightbox_options'));
    const toolbar = <HTMLDivElement>document.getElementById('lightbox_toolbar')

    const lb = new Lightbox(
        lightboxWrapper,
        toolbar,
        options.complete,
        options.container_type,
        options.orderable,
        {toolbarMagnetEltSelector: '#top-bar'}
    );

    if(options.dropable) {
        new DDImageUploader(lb,
            options.putUrl,
            {slideSize: options.slideSize,
            thumbnailSize: options.thumbnailSize}
            );
    }
}

$(() => main());
