const panel = document.querySelector('#panel')
const trigger = document.querySelector('#trigger')
const content = document.querySelector('#content')
const stage = Number(document.querySelector('.scene')?.dataset.stage) || 3

trigger.addEventListener('click', () => {
  const expanded = trigger.getAttribute('aria-expanded') !== 'true'
  trigger.setAttribute('aria-expanded', String(expanded))
  content.setAttribute('aria-hidden', String(!expanded))
  content.inert = !expanded
  panel.classList.toggle('is-open', expanded)
  if (expanded) {
    content.style.height = `${content.scrollHeight}px`
    if (stage === 3) requestAnimationFrame(() => content.classList.add('is-revealed'))
  } else {
    content.style.height = `${content.scrollHeight}px`
    content.classList.remove('is-revealed')
    requestAnimationFrame(() => { content.style.height = '0px' })
  }
})

content.addEventListener('transitionend', (event) => {
  if (event.propertyName === 'height' && panel.classList.contains('is-open')) content.style.height = 'auto'
})
