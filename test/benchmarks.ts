/* eslint-disable max-classes-per-file */
import * as core from '@actions/core';
import { performance } from 'perf_hooks';
import { transform } from '../src/transformer';
import { fixtures } from './shared';

const benchmarkStart = performance.now();

const originPadWidth = Math.max(...fixtures.map(({ origin }) => origin.length));
const fileNamePadWidth = Math.max(
    ...fixtures.map(({ fileName }) => fileName.length)
);

class Sample {
    constructor(readonly duration: number, readonly error: Error | null) {}
}

class TaskResult {
    samples: Sample[] = [];

    private json!: {
        readonly mean: number;
        readonly min: number;
        readonly max: number;
        readonly passed: boolean;
    };

    label: string;

    constructor(readonly origin: string, readonly fileName: string) {
        this.label = `${origin.padEnd(originPadWidth)} | ${fileName.padEnd(
            fileNamePadWidth
        )}`;
    }

    get summary() {
        const { mean, min, max, passed } = this.toJSON();

        return [
            passed ? '✅' : '❌',
            this.fileName,
            passed ? `${mean.toFixed(2)}ms` : '',
            passed ? `${max.toFixed(2)}ms` : '',
            passed ? `${min.toFixed(2)}ms` : '',
            passed ? `${this.samples.length}` : '',
        ];
    }

    toJSON() {
        if (this.json != null) {
            return this.json;
        }

        const durations = this.samples.map(({ duration }) => duration);
        const mean =
            durations.reduce((acc, duration) => acc + duration, 0) /
            durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        const passed = this.samples.every(({ error }) => error == null);

        this.json = {
            mean,
            min,
            max,
            passed,
        };

        return this.json;
    }

    toString() {
        const { mean, min, max } = this.toJSON();

        return `${this.label} | ${mean.toFixed(2)}ms (${min.toFixed(
            2
        )} – ${max.toFixed(2)}ms)`;
    }
}

const iterations = Array(10).fill(null);
const results: TaskResult[] = [];

// Warmup
await transform({ xform: fixtures[0].xform });

let failed = false;

for await (const { fileName, origin, xform } of fixtures) {
    const result = new TaskResult(origin, fileName);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _iteration of iterations) {
        let caught: Error | null = null;

        const start = performance.now();

        try {
            await transform({ xform });
        } catch (error) {
            caught = error instanceof Error ? error : new Error(String(error));
            failed = true;
        }

        const duration = performance.now() - start;
        const sample = new Sample(duration, caught);

        result.samples.push(sample);
    }

    process.stdout.write(`${result.toString()}\n`);
    results.push(result);
}

if (failed) {
    process.exit(1);
}

const totalSeconds = (performance.now() - benchmarkStart) / 1000;
const average =
    results.reduce((acc, result) => {
        const { mean } = result.toJSON();

        return acc + mean;
    }, 0) / results.length;

process.stdout.write(`Average overall: ${average.toFixed(2)}ms\n`);
process.stdout.write(`Total runtime: ${totalSeconds.toFixed(2)}s\n`);

const sorted = results.sort((resultA, resultB) => {
    const { mean: a } = resultA.toJSON();
    const { mean: b } = resultB.toJSON();

    return b - a;
});

const [slowest] = sorted;
const fastest = sorted[sorted.length - 1];

if (process.env.GITHUB_STEP_SUMMARY) {
    const { summary } = core;

    summary.addHeading('Benchmarks', 1);

    const headings = [
        { data: 'Pass', header: true },
        { data: 'Name', header: true },
        { data: 'Average', header: true },
        { data: 'Worst', header: true },
        { data: 'Best', header: true },
        { data: 'Samples', header: true },
    ];
    const collapseResults = results.length > 2;

    if (collapseResults) {
        summary.addTable([
            [{ data: '', header: true }, ...headings],
            ['Slowest', ...slowest.summary],
            ['Fastest', ...fastest.summary],
            [
                'Average overall',
                {
                    data: `${average.toFixed(2)}ms\n`,
                    colspan: String(headings.length),
                },
            ],
            [
                'Total runtime',
                {
                    data: `${totalSeconds.toFixed(2)}s\n`,
                    colspan: String(headings.length),
                },
            ],
        ]);
        summary.addRaw('<details><summary>All results</summary>');
    }

    summary.addTable([headings, ...results.map((task) => task.summary)]);

    if (collapseResults) {
        summary.addRaw('</details>');
    }

    await summary.write({ overwrite: true });
}

process.exit(0);
