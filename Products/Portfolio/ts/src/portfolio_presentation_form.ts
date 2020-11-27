import {FormManager} from "plinn/src/components/form_manager";
import {absolute_url, portal_url} from "plinn/src/components/utils";

function main() {
    const fm = new FormManager(<HTMLFormElement>document.getElementById('sample_image_form'));
    const portfolioPresentationForm = <HTMLFormElement>document.getElementById('sample_image_form');
    (<HTMLInputElement>portfolioPresentationForm.elements.namedItem("path")).className = 'hidden';
    (<HTMLInputElement>portfolioPresentationForm.elements.namedItem("defineSample")).name = 'selectSample';

    fm.onBeforeSubmit = function (m: FormManager) {
        if (m.submitButton.name == 'selectSample') {
            const path = absolute_url().slice(portal_url().length);
            const url = portal_url() + "/ckeditor/filemanager/browser/mac_finder/browser.html?Connector=connectors/plinn/connector&Type=Image&path=" + path + '/';
            const winOptions = "toolbar=no,status=no,resizable=yes,dependent=yes,scrollbars=yes,width=645,height=405";
            window.open(url, 'StandaloneBrowser', winOptions);

            (<any>window).SetUrl = function (url: string) {
                m.submitButton.name = 'defineSample';
                m.submitButton.value = 'Valider';
                (<HTMLInputElement>portfolioPresentationForm.elements
                    .namedItem('path')).value = unescape(url.slice(absolute_url().length + 1));
                const thumbnail = new Image();
                thumbnail.src = url + '/getThumbnail';
                const img = document.getElementById('sampleImageThumbnail');
                img.parentNode.replaceChild(thumbnail, img);
                thumbnail.id = 'sampleImageThumbnail';
            };
            return 'cancelSubmit';
        }
    };
}

main();
