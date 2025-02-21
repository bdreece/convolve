export * from './components';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const gl = canvas.getContext('webgl2');
if (!gl) {
    throw new Error('webgl2 not supported');
}

const pixels = Float32Array.from({
    *[Symbol.iterator]() {
        for (let j = 0; j < gl.canvas.height; ++j) {
            for (let i = 0; i < gl.canvas.width; ++i) {
                yield i;
                yield j;
            }
        }
    }
});

const texCoords = Float32Array.from({
    *[Symbol.iterator]() {
        for (let j = 0; j < gl.canvas.height; ++j) {
            for (let i = 0; i < gl.canvas.width; ++i) {
                yield i / gl.canvas.width;
                yield j / gl.canvas.height;
            }
        }
    }
});

const preview = document.querySelector('image-preview')!;
const form = document.querySelector<HTMLFormElement>('#form')!;
form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);

    let vertexShader: WebGLShader,
        fragmentShader: WebGLShader,
        program: WebGLProgram;

    try {
        vertexShader = createShader(gl.VERTEX_SHADER, data.get('vertex') as string);
        fragmentShader = createShader(gl.FRAGMENT_SHADER, data.get('fragment') as string);
        program = createProgram(vertexShader, fragmentShader);

        transformImage(program, preview.image);
    } catch (e) {
        console.error(e);
    } finally {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }
});

function transformImage(program: WebGLProgram, image: HTMLImageElement) {
    console.time('tranformed image!');

    const positionAttribute = gl.getAttribLocation(program, 'a_position');
    const texCoordAttribute = gl.getAttribLocation(program, 'a_texCoord');
    const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
    const imageUniform = gl.getUniformLocation(program, 'u_image');

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, pixels, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordAttribute);
    gl.vertexAttribPointer(texCoordAttribute, 2, gl.FLOAT, true, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform2f(resolutionUniform, gl.canvas.width, gl.canvas.height);
    gl.uniform1i(imageUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.drawArrays(gl.POINTS, 0, pixels.length / 2);

    console.timeEnd('tranformed image!');
}

function createShader(type: GLenum, source: string) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);

        throw new Error('failed to compile shader', {
            cause: log,
        });
    }

    return shader;
}

function createProgram(vertex: WebGLShader, fragment: WebGLShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);

        throw new Error('failed to link program', {
            cause: log,
        });
    }

    return program;
}
