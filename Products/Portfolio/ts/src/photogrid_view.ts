import * as $ from "jquery";
import {Lightbox} from "./components/lightbox";

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
}

$(() => main());