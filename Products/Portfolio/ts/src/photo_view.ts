import {FilmSlider} from "./components/photo_film_viewer";
import PerfectScrollbar from "perfect-scrollbar";
import "../node_modules/perfect-scrollbar/css/perfect-scrollbar.css";
import * as $ from "jquery";

function main() {
    const bar = document.querySelector('.film_bar');
    const ctx = JSON.parse(bar.getAttribute('data-filmSliderContext'));
    new FilmSlider(
        document.querySelector('.photo_viewer'),
        document.querySelector('.photo_viewer .image-wrapper img'),
        document.querySelector('.film_bar'),
        ctx,
        document.querySelector('.image_toolbar'),
        document.getElementById('Breadcrumbs'));

    new PerfectScrollbar(
        document.querySelector('.film_bar'),
        {suppressScrollY: true});
}

$(() => main());