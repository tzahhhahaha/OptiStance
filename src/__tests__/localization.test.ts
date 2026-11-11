import { describe, expect, it } from 'vitest';
import { localeFromSetting, translate } from '../app/utils/localization';

describe('localization', () => {
  it('maps each Settings language to its document locale', () => {
    expect(localeFromSetting('English (US)')).toBe('en');
    expect(localeFromSetting('Spanish (ES)')).toBe('es');
    expect(localeFromSetting('French (FR)')).toBe('fr');
    expect(localeFromSetting('Japanese (JP)')).toBe('ja');
  });

  it('translates known interface text and preserves unknown text', () => {
    expect(translate('Settings & Privacy', 'Spanish (ES)')).toBe('Configuración y privacidad');
    expect(translate('Optistance', 'French (FR)')).toBe('Optistance');
    expect(translate('Untranslated product term', 'Japanese (JP)')).toBe('Untranslated product term');
    expect(translate('Language', 'English (US)')).toBe('Language');
  });
});