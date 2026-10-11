// ---------- 基础 ----------
const params = new URLSearchParams(location.search);
const chapterId = params.get('id');

let allChapters = [];
let currentIndex = -1;

// ---------- 加载章节 ----------
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

    loadComments();
  });

// ---------- 加载评论 ----------
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

// ---------- 提交评论 ----------
async function submitComment() {
  const nickname = document.getElementById('nickname').value.trim() || '匿名';
  const content = document.getElementById('commentText').value.trim();

  if (!content) {
    alert('评论不能为空');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '提交中...';

  try {
    await pushComment({
      chapterId,
      nickname,
      content,
      time: new Date().toISOString()
    });

    localStorage.setItem('nickname', nickname);
    document.getElementById('commentText').value = '';
    await loadComments();
  } catch (e) {
    alert('提交失败：' + e.message);
    console.error(e);
  }

  btn.disabled = false;
  btn.textContent = '发表评论';
}

// ---------- 写入 GitHub ----------
async function pushComment(newComment) {
  const { owner, repo, token } = GITHUB_CONFIG;

  if (!owner || !repo || !token || token.indexOf('ghp_') !== 0) {
    throw new Error('config.js 里的 owner/repo/token 没填好');
  }

  const api = `https://api.github.com/repos/${owner}/${repo}/contents/comments.json`;

  // 1. 读取当前文件
  const getRes = await fetch(api + '?t=' + Date.now(), {
    headers: { Authorization: `token ${token}` }
  });
  if (!getRes.ok) {
    throw new Error('读取失败（状态码 ' + getRes.status + '），检查 token 和网络');
  }
  const file = await getRes.json();

  // 2. 解码 + 追加
  const current = JSON.parse(
    decodeURIComponent(escape(atob(file.content.replace(/\s/g, ''))))
  );
  current.push(newComment);

  // 3. 提交
  const putRes = await fetch(api, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `新评论 by ${newComment.nickname}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2)))),
      sha: file.sha
    })
  });
  if (!putRes.ok) {
    throw new Error('写入失败（状态码 ' + putRes.status + '）');
  }
}

// ---------- 页面加载完绑定按钮 ----------
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('submitBtn').addEventListener('click', submitComment);

  const savedNick = localStorage.getItem('nickname');
  if (savedNick) {
    document.getElementById('nickname').value = savedNick;
  }
});

// ---------- 防 XSS ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}