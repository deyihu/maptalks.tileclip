// Rollup plugins
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import { terser } from 'rollup-plugin-terser';
import mtkWorkerPlugin from './worker-plugin';

import pkg from './package.json';
const path = require('path');
const product = process.env.NODE_ENV.trim() === 'prd';

const FILEMANE = pkg.name;

const banner = `/*!\n * ${pkg.name} v${pkg.version}\n  */`;
const external = ['maptalks'];
const globals = {
    maptalks: 'maptalks'
};

const plugins = [
    json(),
    nodeResolve(),
    commonjs()
    // babel({
    //     // exclude: ['node_modules/**']
    // })
];

function getEntry() {
    return path.join(__dirname, './index.js');
}

const bundles = [
    {
        input: 'src/worker/index',
        plugins: product ? plugins.concat([terser(), mtkWorkerPlugin()]) : plugins.concat([mtkWorkerPlugin()]),
        output: {
            format: 'amd',
            name: 'maptalks',
            globals: {
                'maptalks': 'maptalks'
            },
            extend: true,
            file: 'dist/worker.js'
        }
    },
    {
        input: getEntry(),
        external: external,
        plugins: plugins,
        output: {
            'format': 'umd',
            'name': 'maptalks',
            'file': `dist/${FILEMANE}.js`,
            'sourcemap': true,
            'extend': true,
            'banner': banner,
            globals
        }
    },
    {
        input: getEntry(),
        external: external,
        plugins: plugins.concat([terser()]),
        output: {
            'format': 'umd',
            'name': 'maptalks',
            'file': `dist/${FILEMANE}.min.js`,
            'sourcemap': false,
            'extend': true,
            'banner': banner,
            globals
        }
    }

];

const filterBundles = product ? bundles : bundles.slice(0, 2);

export default filterBundles;
