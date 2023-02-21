import type { Transform } from '../src/transformer';

declare global {
    const enketo: {
        transformer: {
            transform: Transform;
        };
    };
}
