import styles from '../styles/index.css?inline';
const defaults = {
    vertex: `#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

uniform vec2 u_resolution;

out vec2 v_texCoord;

void main() {
    // convert pixel position to clip-space
    vec2 normalized = a_position / u_resolution;
    vec2 scaled = 2.0 * normalized;
    vec2 translated = scaled - 1.0;

    gl_Position = vec4(translated * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord;
}
`,

    fragment: `#version 300 es

// Sample convolution matrices
#define identity mat3(0, 0, 0, 0, 1, 0, 0, 0, 0)
#define edge0 mat3(1, 0, -1, 0, 0, 0, -1, 0, 1)
#define edge1 mat3(0, 1, 0, 1, -4, 1, 0, 1, 0)
#define edge2 mat3(-1, -1, -1, -1, 8, -1, -1, -1, -1)
#define sharpen mat3(0, -1, 0, -1, 5, -1, 0, -1, 0)
#define box_blur mat3(1, 1, 1, 1, 1, 1, 1, 1, 1) * 0.1111
#define gaussian_blur mat3(1, 2, 1, 2, 4, 2, 1, 2, 1) * 0.0625
#define emboss mat3(-2, -1, 0, -1, 1, 1, 0, 1, 2)
#define deepfry mat3(-255, -127, 0, -1, 1, 1, 0, 127, 255)

precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_image;
uniform vec2 u_resolution;

out vec4 outColor;

// Find coordinate of matrix element from index
vec2 kpos(int index)
{
    return vec2[9] (
        vec2(-1, -1), vec2(0, -1), vec2(1, -1),
        vec2(-1, 0), vec2(0, 0), vec2(1, 0), 
        vec2(-1, 1), vec2(0, 1), vec2(1, 1)
    )[index] / u_resolution.xy;
}


// Extract region of dimension 3x3 from sampler centered in uv
// sampler : texture sampler
// uv : current coordinates on sampler
// return : an array of mat3, each index corresponding with a color channel
mat3[3] region3x3(sampler2D sampler, vec2 uv)
{
    // Create each pixels for region
    vec4[9] region;
    
    for (int i = 0; i < 9; i++)
        region[i] = texture(sampler, uv + kpos(i));

    // Create 3x3 region with 3 color channels (red, green, blue)
    mat3[3] mRegion;
    
    for (int i = 0; i < 3; i++)
        mRegion[i] = mat3(
        	region[0][i], region[1][i], region[2][i],
        	region[3][i], region[4][i], region[5][i],
        	region[6][i], region[7][i], region[8][i]
    	);
    
    return mRegion;
}

// Convolve a texture with kernel
// kernel : kernel used for convolution
// sampler : texture sampler
// uv : current coordinates on sampler
vec3 convolve(mat3 kernel, sampler2D sampler, vec2 uv)
{
    vec3 fragment;
    
    // Extract a 3x3 region centered in uv
    mat3[3] region = region3x3(sampler, uv);
    
    // for each color channel of region
    for (int i = 0; i < 3; i++)
    {
        // get region channel
        mat3 rc = region[i];
        // component wise multiplication of kernel by region channel
        mat3 c = matrixCompMult(kernel, rc);
        // add each component of matrix
        float r = c[0][0] + c[1][0] + c[2][0]
                + c[0][1] + c[1][1] + c[2][1]
                + c[0][2] + c[1][2] + c[2][2];
        
        // for fragment at channel i, set result
        fragment[i] = r;
    }
    
    return fragment;    
}

void main() {
    vec3 color = convolve(identity, u_image, v_texCoord);

    outColor = vec4(color, 255.0);
}
`,
};

const template = document.createElement('template');

template.innerHTML = `
    <style>${styles}</style>

    <ol
        class="form-input list-decimal whitespace-pre-wrap h-[400px] overflow-y-scroll pl-10 text-wrap font-mono text-sm"
        contenteditable
    >
    </ol>
`;

export default class ShaderEditor extends HTMLElement {
    static formAssociated = true;
    static observedAttributes = [
        'disabled',
        'readonly',
        'required',
        'kind',
        'value',
    ] as const;

    private readonly _internals: ElementInternals;
    private readonly _list: HTMLOListElement;
    private _kind: 'vertex' | 'fragment' | undefined;

    get disabled() {
        return this._internals.states.has('disabled');
    }

    set disabled(value) {
        if (value) {
            this._internals.states.add('disabled');
        } else {
            this._internals.states.delete('disabled');
        }

        this._internals.ariaDisabled = '' + value;
    }

    get readOnly() {
        return this._internals.states.has('readonly');
    }

    set readOnly(value) {
        if (value) {
            this._internals.states.add('readonly');
        } else {
            this._internals.states.delete('readonly');
        }

        this._internals.ariaReadOnly = '' + value;
    }

    get required() {
        return this._internals.states.has('required');
    }

    set required(value) {
        if (value) {
            this._internals.states.add('required');
        } else {
            this._internals.states.delete('required');
        }

        this._internals.ariaRequired = '' + value;
    }

    get kind() {
        return this._kind;
    }

    set kind(value) {
        this._kind = value;
    }

    get value() {
        let str = '';
        for (const li of this._list.children) {
            str += li.textContent + '\n';
        }

        return str;
    }

    set value(value) {
        this._list.replaceChildren();
        for (const line of value.split('\n')) {
            const li = this._list.appendChild(document.createElement('li'));
            li.textContent = line;
        }

        this._internals.setFormValue(value);
    }

    get form() {
        return this._internals.form;
    }

    get name() {
        return this.getAttribute('name');
    }

    get type() {
        return this.getAttribute('type');
    }

    get validity() {
        return this._internals.validity;
    }

    get validationMessage() {
        return this._internals.validationMessage;
    }

    get willValidate() {
        return this._internals.willValidate;
    }

    constructor() {
        super();

        this._internals = this.attachInternals();
        this._internals.role = 'textbox';
        this._internals.ariaMultiLine = 'true';

        const shadow = this.attachShadow({
            mode: 'open',
            delegatesFocus: true
        });

        shadow.append(
            template.content.cloneNode(true),
        );

        this._list = shadow.querySelector('ol')!;
    }

    checkValidity() {
        return this._internals.checkValidity();
    }

    reportValidity() {
        return this._internals.reportValidity();
    }

    setCustomValidity(message: string) {
        this._internals.setValidity({ customError: !!message }, message, this._list);
    }

    /** @internal */
    connectedCallback() {
        this._list.addEventListener('input', this);

        const kind = this.getAttribute('kind');
        if (kind === 'vertex') {
            this.value = defaults.vertex;
        } else if (kind === 'fragment') {
            this.value = defaults.fragment;
        }

        this._internals.setFormValue(this.value);
    }

    /** @internal */
    disconnectedCallback() {
        this._list.removeEventListener('input', this);
    }

    /** @internal */
    attributeChangedCallback(name: typeof ShaderEditor.observedAttributes[number], _: string, value: string) {
        switch (name) {
            case 'value':
                this.value = value;
                break;

            default:
                this._list.setAttribute(name, value);
        }
    }

    /** @internal */
    formDisabledCallback(disabled: boolean) {
        if (disabled) {
            this._internals.states.add('disabled');
        } else {
            this._internals.states.delete('disabled');
        }
    }

    /** @internal */
    handleEvent(e: Event) {
        if (e.type === 'input') {
            this._internals.setFormValue(this.value);
        }

        this.dispatchEvent(new Event(e.type, e));
    }
}

customElements.define('shader-editor', ShaderEditor);

declare global {
    interface HTMLElementTagNameMap {
        'shader-editor': ShaderEditor,
    }
}
