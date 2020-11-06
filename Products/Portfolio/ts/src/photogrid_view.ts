import {Lightbox} from "./components/lightbox";
import * as $ from "jquery";

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
        console.log('TODO: upload drop support !');
    }
}

$(() => main());
