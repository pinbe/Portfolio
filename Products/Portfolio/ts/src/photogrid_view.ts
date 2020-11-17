import * as $ from "jquery";
import { absolute_url } from "plinn/src/components/utils";
import {Lightbox} from "./components/lightbox";
import {DDImageUploader} from "./components/portfolio_upload";

function main() {
    const grid = <HTMLDivElement>document.querySelector('.lightbox');
    const initArgs = JSON.parse(grid.getAttribute('data-lightbox_init_args'));
    const toolbar = <HTMLDivElement>document.getElementById('lightbox_toolbar');

    const lb = new Lightbox(
        grid,
        toolbar,
        initArgs.complete,
        initArgs.container_type,
        initArgs.orderable,
        initArgs.options
    );

    if(initArgs.dropable) {
        const uploadUrl = `${absolute_url()}/put_upload`;
        new DDImageUploader(lb, uploadUrl, initArgs.options);
    }
}

$(() => main());