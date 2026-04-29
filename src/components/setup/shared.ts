export type PlayerSelection = {
  selected: boolean
  teeId: string
  sideId: string
}

export function teeDotClass(color: string | undefined) {
  switch (color) {
    case 'red':
      return 'bg-[color:var(--color-tee-red)]'
    case 'yellow':
      return 'bg-[color:var(--color-tee-yellow)]'
    case 'orange':
      return 'bg-[color:var(--color-tee-orange)]'
    case 'blue':
      return 'bg-[color:var(--color-tee-blue)]'
    case 'black':
      return 'bg-[color:var(--color-ink)]'
    case 'white':
      return 'bg-[color:var(--color-tee-white)] border border-[color:var(--color-line)]'
    default:
      return 'bg-[color:var(--color-tee-green)]'
  }
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
