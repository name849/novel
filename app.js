// 读取章节列表
fetch('chapters.json')
  .then(r => r.json())
  .then(chapters => {
    const list = document.getElementById('list');
    chapters.forEach(ch => {
      const li = document.createElement('li');
      const date = new Date(ch.time).toLocaleDateString('zh-CN');
      li.innerHTML = `
        <a href="chapter.html?id=${ch.id}">${ch.title}</a>
        <span class="time">${date}</span>
      `;
      list.appendChild(li);
    });
  });

// 显示"继续阅读"
const lastId = localStorage.getItem('lastChapter');
const lastTitle = localStorage.getItem('lastTitle');
if (lastId && lastTitle) {
  document.getElementById('continue').innerHTML = `
    <div class="continue-banner">
      📖 继续阅读：<a href="chapter.html?id=${lastId}">${lastTitle}</a>
    </div>
  `;
}