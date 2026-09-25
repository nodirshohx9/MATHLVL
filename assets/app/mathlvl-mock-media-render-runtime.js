
(function(){
  if(typeof renderMockQuestion !== 'function') return;
  const originalRenderMockQuestion = renderMockQuestion;
  renderMockQuestion = function(){
    originalRenderMockQuestion();
    if(!activeMock) return;
    const isClosed = mockIndex < activeMock.closed.length;
    const localIndex = isClosed ? mockIndex : mockIndex - activeMock.closed.length;
    const q = isClosed ? activeMock.closed[localIndex] : activeMock.open[localIndex];
    if(!q?.imageUrl) return;
    const questionEl = document.getElementById('mock-question-text');
    if(!questionEl || document.getElementById('mock-question-visual')) return;
    const visual = document.createElement('div');
    visual.id = 'mock-question-visual';
    visual.className = 'mock-question-visual';
    const img = document.createElement('img');
    img.src = q.imageUrl;
    img.alt = q.imageAlt || 'Savol rasmi yoki chizmasi';
    img.loading = 'eager';
    visual.appendChild(img);
    questionEl.insertAdjacentElement('afterend', visual);
  };
})();
