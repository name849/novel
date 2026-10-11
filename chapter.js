// 拿到网址里的 ?id=001
const params = new URLSearchParams(location.search);
const chapterId = params.get('id');

let allChapters = [];
let currentIndex = -1;

// 读取所有章节
fetch('chapters.json')
  .then(r => r.json())
  .then(chapters => {
    allChapters = chapters;
    currentIndex = chapters.findIndex(c => c.id === chapterId);

    if (currentIndex === -1) {
      document.getElementById('title').textContent = '章节不存在';
      return;
    }

    const ch = chapters[currentIndex];
    document.title = ch.title;
    document.getElementById('title').textContent = ch.title;
    document.getElementById('content').textContent = ch.content;

    // 上一章 / 下一章
    if (currentIndex > 0) {
      document.getElementById('prev').href = `chapter.html?id=${chapters[currentIndex - 1].id}`;
    } else {
      document.getElementById('prev').style.visibility = 'hidden';
    }
    if (currentIndex < chapters.length - 1) {
      document.getElementById('next').href = `chapter.html?id=${chapters[currentIndex + 1].id}`;
    } else {
      document.getElementById('next').style.visibility = 'hidden';
    }

    // 记录进度
    localStorage.setItem('lastChapter', ch.id);
    localStorage.setItem('lastTitle', ch.title);

    // 加载评论
    loadComments();
  });

// 读取并显示评论
function loadComments() {
  fetch('comments.json?t=' + Date.now())
    .then(r => r.json())
    .then(all => {
      const mine = all.filter(c => c.chapterId === chapterId);
      const box = document.getElementById('comments');
      if (mine.length === 0) {
        box.innerHTML = '<p style="color:#999;font-size:14px;">还没有评论，来抢沙发～</p>';
        return;
      }
      box.innerHTML = mine.map(c => `
        <div class="comment">
          <div class="meta">
            <span class="nickname">${escapeHtml(c.nickname)}</span>
            · ${new Date(c.time).toLocaleString('zh-CN')}
          </div>
          <div>${escapeHtml(c.content)}</div>
        </div>
      `).join('');
    });
}

// 提交评论
function submitComment() {
  const nickname = document.getElementById('nickname').value.trim() || '匿名';
  const content = document.getElementById('commentText').value.trim();
  if (!content) {
    alert('评论不能为空');
    return;
  }

  // 把昵称记住，下次不用重填
  localStorage.setItem('nickname', nickname);

  // 注意：这里先做"本地假提交"，等你配置好 GitHub 后再改成真提交
  alert('评论功能还没接后台，下一步教你接。\n\n你的评论：\n' + content);
}

// 自动填上次的昵称
const savedNick = localStorage.getItem('nickname');
if (savedNick) document.getElementById('nickname').value = savedNick;

// 防 XSS
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}