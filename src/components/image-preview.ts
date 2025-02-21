import styles from '../styles/index.css?inline';

const template = document.createElement('template');

template.innerHTML = `
    <style>
        ${styles}
    </style>

    <img
        class="outline-gray-500"
        width="400"
        height"300"
    >
`;

export default class ImagePreview extends HTMLElement {
    static readonly observedAttributes = [
        'src',
        'height',
        'width',
    ] as const;

    private readonly _image: HTMLImageElement;
    private _input: HTMLInputElement | undefined;

    private _src: string = 'https://placehold.co/400x300';
    private _height: number = 300;
    private _width: number = 400;

    get image() {
        return this._image;
    }

    get src() {
        return this._src;
    }

    set src(value) {
        this._src = value;
        this._updateInput(value);
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._image.height = this._height = value;
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._image.width = this._width = value;
    }

    constructor() {
        super();

        const shadow = this.attachShadow({
            mode: 'open',
        });

        shadow.append(
            template.content.cloneNode(true),
        );

        this._image = shadow.querySelector('img')!;
    }

    /** @internal */
    connectedCallback() {
        this._image.width = this._width = +(this.getAttribute('width') || this._width);
        this._image.height = this._height = +(this.getAttribute('height') || this._height);
        this._src = this.getAttribute('src') || this._src;
        this._input = document.querySelector(this._src);
        this._input?.addEventListener('change', this);
    }

    /** @internal */
    disconnectedCallback() {
        this._input?.removeEventListener('change', this);
    }

    /** @internal */
    attributeChangedCallback(name: typeof ImagePreview.observedAttributes[number], _: string, value: string) {
        switch (name) {
            case 'src':
                this.src = value;
                break;

            default:
                this._image.setAttribute(name, value);
        }
    }

    handleEvent(e: Event) {
        switch (e.type) {
            case 'change':
                this._handleChange();
                break;

            case 'reset':
                this._handleReset();
                break;
        }
    }

    private _handleChange() {
        if (!this._input.files.length) {
            this._image.src = `https://placehold.co/${this.width}x${this.height}`;
        }

        const file = this._input.files.item(0)!;
        const fr = new FileReader();
        fr.addEventListener('load', () => {
            this._image.src = fr.result as string;
        }, {
            once: true,
        });

        fr.readAsDataURL(file);
    }

    private _handleReset() {
        this._image.src = `https://placehold.co/${this.width}x${this.height}`;
    }

    private _updateInput(selector: string) {
        if (this._input) {
            this._input.removeEventListener('change', this);
        }

        if (selector) {
            this._input = document.querySelector(selector);
            this._input?.addEventListener('change', this);
            this._input.form.addEventListener('reset', this);
        }
    }
}

customElements.define('image-preview', ImagePreview);

declare global {
    interface HTMLElementTagNameMap {
        'image-preview': ImagePreview,
    }
}
