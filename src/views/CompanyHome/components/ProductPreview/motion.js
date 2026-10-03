export function setupTabIndicator(list, activeTab) {
  const measure = () => {
    const bounds = list.getBoundingClientRect()
    const tab = activeTab.getBoundingClientRect()
    list.style.setProperty('--bnp-tab-x', `${tab.left - bounds.left}px`)
    list.style.setProperty('--bnp-tab-width', `${tab.width}px`)
  }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(list)
  for (const tab of list.children) observer.observe(tab)
  return () => observer.disconnect()
}
