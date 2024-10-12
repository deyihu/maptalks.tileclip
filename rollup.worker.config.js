import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import { terser } from 'rollup-plugin-terser';

module.exports = [
    {
        input: 'src/worker/index',
        plugins: [
            json(),
            nodeResolve({
                module: true,
                jsnext: true,
                main: true
            }),
            commonjs(),
            // terser()
        ],
        external: ['maptalks'],
        output: {
            format: 'amd',
            name: 'maptalks',
            globals: {
                'maptalks': 'maptalks'
            },
            extend: true,
            file: 'dist/worker.amd.js'
        }
        // watch: {
        //     include: 'src/worker/**'
        // }
    }
];
