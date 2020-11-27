import * as $ from "jquery";
import {absolute_url} from "plinn/src/components/utils";
import {DefaultTailLoader, Lightbox, TailLoader} from "./components/lightbox";
import {DDImageUploader} from "./components/portfolio_upload";

class SearchResultTailLoader implements TailLoader {
    private readonly searchUrl: string;
    private readonly initQuery: any;

    constructor(searchUrl: string, initQueryJson: string) {
        this.searchUrl = searchUrl;
        this.initQuery = JSON.parse(initQueryJson);
    }

    fetch(start: number, size: number): Promise<HTMLElement> {
        console.info('SearchResultTailLoader.fetch', start, size);
        return new Promise<HTMLElement>((resolve: (doc: HTMLElement) => void, reject: (req: XMLHttpRequest) => void) => {
            const req = new XMLHttpRequest();
            req.addEventListener('load', (evt) => {
                    const resp = <XMLHttpRequest>evt.target;
                    if (resp.status === 200)
                        resolve(resp.responseXML.documentElement);
                    else
                        reject(resp);
                }
            );
            const url = new URL(this.searchUrl);
            const query = {...this.initQuery};
            query.b_start = start;
            query.b_size = size;
            url.searchParams
                .append('tail_search', JSON.stringify(query));
            req.open('GET', url.toString(), true);
            console.log(url.toString());
            req.send();
        });
    }
}

function main() {
    const grid = <HTMLDivElement>document.querySelector('.lightbox');
    const initArgs = JSON.parse(grid.getAttribute('data-lightbox_init_args'));
    const toolbar = <HTMLDivElement>document.getElementById('lightbox_toolbar');

    let tailLoader: TailLoader;
    if (initArgs.container_type !== 'search_results') {
        tailLoader = new DefaultTailLoader(initArgs.container_type);
    } else {
        const searchResWrapper = document.getElementById('search-results');
        tailLoader = new SearchResultTailLoader(
            searchResWrapper.getAttribute('data-search_url'),
            searchResWrapper.getAttribute('data-search_params')
        );
    }

    const lb = new Lightbox(
        grid,
        toolbar,
        initArgs.complete,
        initArgs.orderable,
        tailLoader,
        initArgs.options
    );

    if (initArgs.dropable) {
        const uploadUrl = `${absolute_url()}/put_upload`;
        new DDImageUploader(lb, uploadUrl, initArgs.options);
    }
}

$(() => main());