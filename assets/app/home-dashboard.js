// Display-only sample values for the home dashboard.
const homeDashboardStats = {
  streak: '7 kun',
  xp: '+120 XP',
  solved: '48'
};

document.querySelectorAll('#panel-home [data-home-stat]').forEach(element => {
  element.textContent = homeDashboardStats[element.dataset.homeStat];
});
