import { expect, type Locator } from '@playwright/test';

export async function selectOption(control: Locator, option: string | { label: string }) {
  await control.click();
  const list = control.page().getByRole('listbox').last();
  await expect(list).toBeVisible();
  const item =
    typeof option === 'string'
      ? list.locator(`[data-value=${JSON.stringify(option)}]`)
      : list.getByRole('option', { name: option.label, exact: true });
  await item.click();
  await expect(list).toBeHidden();
}

export async function selectedValue(control: Locator) {
  await control.click();
  const list = control.page().getByRole('listbox').last();
  const value = await list.getByRole('option', { selected: true }).getAttribute('data-value');
  await control.page().keyboard.press('Escape');
  await expect(list).toBeHidden();
  if (value === null) throw new Error('Selected option has no value.');
  return value;
}
