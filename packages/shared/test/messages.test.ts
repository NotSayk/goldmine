import { describe, expect, it } from 'vitest';
import { parseClientMessage } from '../src';

describe('validation des messages entrants', () => {
  it('accepte les messages valides et normalise les champs', () => {
    expect(parseClientMessage('{"type":"joinRoom","code":" abcd2 ","name":"  Gim   li "}')).toEqual(
      {
        ok: true,
        message: { type: 'joinRoom', code: 'ABCD2', name: 'Gim li' },
      },
    );
    expect(
      parseClientMessage('{"type":"action","action":{"type":"chooseExitAction","index":1}}'),
    ).toEqual({
      ok: true,
      message: { type: 'action', action: { type: 'chooseExitAction', index: 1 } },
    });
  });

  it('refuse le JSON invalide, les champs inconnus et les valeurs hors bornes', () => {
    for (const raw of [
      'pas du json',
      '{"type":"inconnu"}',
      '{"type":"ping","extra":1}',
      '{"type":"createRoom","name":""}',
      `{"type":"createRoom","name":"${'x'.repeat(30)}"}`,
      '{"type":"action","action":{"type":"drawExit","playerId":"p2"}}',
      '{"type":"action","action":{"type":"chooseSwapTarget","dwarfId":9}}',
      '{"type":"hello","sessionToken":"<script>"}',
      '{"type":"joinRoom","code":"AB","name":"x"}',
      'null',
      JSON.stringify({ type: 'createRoom', name: 'a'.repeat(5000) }),
    ]) {
      expect(parseClientMessage(raw).ok, raw).toBe(false);
    }
  });
});
