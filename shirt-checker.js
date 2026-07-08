// shirt-checker.js — team autocomplete for the Shirt Value Checker page
const TEAMS_API = 'https://kitfinder-search.wearekitfinder.workers.dev/teams';

let ALL_TEAMS = [];
let teamsState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
let selectedTeam = null;
let teamDropdownOpen = false;

function loadTeamsOnce() {
  if (teamsState === 'loading' || teamsState === 'loaded') return;
  teamsState = 'loading';
  fetch(TEAMS_API)
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (data) {
      ALL_TEAMS = Array.isArray(data.teams) ? data.teams : [];
      teamsState = 'loaded';
      if (teamDropdownOpen) renderTeamDropdown(document.getElementById('teamSearchInput').value);
    })
    .catch(function () {
      teamsState = 'error';
      if (teamDropdownOpen) renderTeamDropdown(document.getElementById('teamSearchInput').value);
    });
}

function matchesTeam(team, q) {
  if (team.name.toLowerCase().includes(q)) return true;
  return (team.aliases || []).some(function (a) { return a.toLowerCase().includes(q); });
}

function renderTeamDropdown(query) {
  const dd = document.getElementById('teamSearchDropdown');
  if (!dd) return;
  dd.innerHTML = '';

  if (teamsState === 'loading' || teamsState === 'idle') {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = 'Loading teams…';
    dd.appendChild(d);
    return;
  }
  if (teamsState === 'error') {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = 'Could not load teams. Try again.';
    dd.appendChild(d);
    return;
  }

  const q = (query || '').trim().toLowerCase();
  const results = q === ''
    ? []
    : ALL_TEAMS.filter(function (t) { return matchesTeam(t, q); }).slice(0, 8);

  if (results.length === 0) {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = q === '' ? 'Start typing a team name…' : 'No teams found';
    dd.appendChild(d);
    return;
  }

  results.forEach(function (t) {
    const opt = document.createElement('div');
    opt.className = 'sc-team-opt';
    opt.innerHTML = '<span>' + t.name + '</span><span class="sc-team-country">' + (t.country || '') + '</span>';
    opt.addEventListener('mousedown', function (e) {
      e.preventDefault();
      selectTeam(t);
    });
    dd.appendChild(opt);
  });
}

function selectTeam(team) {
  selectedTeam = team;
  document.getElementById('teamSearchInput').value = team.name;
  closeTeamDropdown();
  // TODO: once size/season/version fields exist, trigger the live count/avg price lookup here.
}

function onTeamInput(value) {
  selectedTeam = null;
  openTeamDropdown();
  renderTeamDropdown(value);
}

function onTeamFocus() {
  openTeamDropdown();
  renderTeamDropdown(document.getElementById('teamSearchInput').value);
}

function onTeamBlur() {
  closeTeamDropdown();
}

function openTeamDropdown() {
  document.getElementById('teamSearchDropdown').classList.add('open');
  document.getElementById('teamSearchInput').classList.add('open');
  teamDropdownOpen = true;
}

function closeTeamDropdown() {
  document.getElementById('teamSearchDropdown').classList.remove('open');
  document.getElementById('teamSearchInput').classList.remove('open');
  teamDropdownOpen = false;
}

document.addEventListener('DOMContentLoaded', loadTeamsOnce);
