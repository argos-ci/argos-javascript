import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockServer } from '../mocks/server';
import { finalize } from './finalize';

setupMockServer();

describe('#finalize', () => {
    beforeEach(() => {
        vi.stubEnv('ARGOS_COMMIT', 'f16f980bd17cccfa93a1ae7766727e67950773d0');
        vi.stubEnv('ARGOS_BRANCH', 'main');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('finalizes builds matching the nonce', async () => {
        const result = await finalize({
            apiBaseUrl: 'https://api.argos-ci.dev',
            token: '92d832e0d22ab113c8979d73a87a11130eaa24a9',
            parallel: { nonce: 'nonce-123' },
        });

        expect(result).toEqual({
            builds: [{ id: '456', url: 'https://app.argos-ci.dev/builds/456' }],
            skippedBuild: null,
        });
    });

    it('returns no builds when the nonce matches nothing', async () => {
        const result = await finalize({
            apiBaseUrl: 'https://api.argos-ci.dev',
            token: '92d832e0d22ab113c8979d73a87a11130eaa24a9',
            parallel: { nonce: 'empty' },
        });

        expect(result).toEqual({ builds: [], skippedBuild: null });
    });

    it('throws without a nonce', async () => {
        await expect(
            finalize({
                apiBaseUrl: 'https://api.argos-ci.dev',
                token: '92d832e0d22ab113c8979d73a87a11130eaa24a9',
            })
        ).rejects.toThrow('parallel.nonce is required to finalize the build');
    });

    describe('with skipIfEmpty', () => {
        it('creates a skipped build when the nonce matches nothing', async () => {
            const result = await finalize({
                apiBaseUrl: 'https://api.argos-ci.dev',
                token: '92d832e0d22ab113c8979d73a87a11130eaa24a9',
                parallel: { nonce: 'empty' },
                skipIfEmpty: true,
                buildName: 'unit',
            });

            expect(result).toEqual({
                builds: [],
                skippedBuild: {
                    id: '123',
                    url: 'https://app.argos-ci.dev/builds/123',
                },
            });
        });

        it('does not create a skipped build when builds are finalized', async () => {
            const result = await finalize({
                apiBaseUrl: 'https://api.argos-ci.dev',
                token: '92d832e0d22ab113c8979d73a87a11130eaa24a9',
                parallel: { nonce: 'nonce-123' },
                skipIfEmpty: true,
                buildName: 'unit',
            });

            expect(result).toEqual({
                builds: [{ id: '456', url: 'https://app.argos-ci.dev/builds/456' }],
                skippedBuild: null,
            });
        });
    });
});
