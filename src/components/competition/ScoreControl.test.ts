import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ScoreControl from './ScoreControl.vue'

describe('ScoreControl', () => {
  it('renders the label, subtitle, badge and par hint', () => {
    const wrapper = mount(ScoreControl, {
      props: {
        label: 'Alice',
        subtitle: 'Black tee',
        badge: 'PH 6',
        value: 4,
        par: 4,
      },
    })

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Black tee')
    expect(wrapper.text()).toContain('PH 6')
    expect(wrapper.text()).toContain('Par på hull 4')
    expect(wrapper.find('input').element.value).toBe('4')
  })

  it('emits update with par when nudging from a null value', async () => {
    const wrapper = mount(ScoreControl, {
      props: {
        label: 'Alice',
        value: null,
        par: 4,
      },
    })

    await wrapper.findAll('button')[1].trigger('click')
    const events = wrapper.emitted('update') ?? []
    expect(events.at(-1)).toEqual([5])
  })

  it('emits null when the input is cleared', async () => {
    const wrapper = mount(ScoreControl, {
      props: {
        label: 'Alice',
        value: 5,
        par: 4,
      },
    })

    await wrapper.find('input').setValue('')
    const events = wrapper.emitted('update') ?? []
    expect(events.at(-1)).toEqual([null])
  })

  it('clamps non-positive entries to 1', async () => {
    const wrapper = mount(ScoreControl, {
      props: {
        label: 'Alice',
        value: 4,
        par: 4,
      },
    })

    await wrapper.find('input').setValue('-3')
    const events = wrapper.emitted('update') ?? []
    expect(events.at(-1)).toEqual([1])
  })
})
