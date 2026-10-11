// ============ 密码 ============
// 自己改一个只有你知道的密码
const ADMIN_PASSWORD = 'woaini520';

// ============ 登录 ============
function login() {
  const pwd = document.getElementById('pwd').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_ok', '1');
    showPanel();
  } else {
    document.getElementById('loginError').textContent = '密码错误';
  }
}

function logout() {
  sessionStorage.removeItem('admin_ok');
  location.reload();
}

function showPanel() {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('panel').classList.remove('hidden');
  loadChapters();
  loadComments();
}

// 页面加载时检查是否已登录
if (sessionStorage.getItem('admin_ok') === '1') {
  showPanel();
}

// 回车登录
document.getElementById('pwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

// ============ 读取章节 ============
let chaptersCache = [];

async function loadChapters() {
  const res = await fetch('chapters.json?t=' + Date.now());
  chaptersCache = await res.json();
  const box = document.getElementById('chapterList');
  if (chaptersCache.length === 0) {
    box.innerHTML = '<p style="color:#999;">还没有章节</p>';
    return;
  }
  box.innerHTML = chaptersCache.map((ch, i) => `
    <div class="chapter-item">
      <div class="info">
        <a href="chapter.html?id=${ch.id}" target="_blank">${escapeHtml(ch.title)}</a>
        <div class="id">ID: ${escapeHtml(ch.id)}</div>
      </div>
      <button class="btn btn-danger" onclick="deleteChapter('${ch.id}')">删除</button>
    </div>
  `).join('');
}

// ============ 发布新章节 ============
async function publishChapter() {
  const id = document.getElementById('newId').value.trim();
  const title = document.getElementById('newTitle').value.trim();
  const content = document.getElementById('newContent').value.trim();

  if (!id || !title || !content) {
    alert('三个字段都要填');
    return;
  }
  if (chaptersCache.some(c => c.id === id)) {
    alert('这个章节 ID 已经存在，换一个');
    return;
  }

  const btn = document.getElementById('publishBtn');
  const status = document.getElementById('publishStatus');
  btn.disabled = true;
  status.textContent = '发布中...';

  try {
    const newCh = {
      id,
      title,
      content,
      time: new Date().toISOString()
    };
    const list = chaptersCache.concat([newCh]);
    await writeFile('chapters.json', list, `发布章节：${title}`);
    status.textContent = '✅ 发布成功';
    clearForm();
    await loadChapters();
  } catch (e) {
    status.textContent = '❌ 失败：' + e.message;
  }

  btn.disabled = false;
  setTimeout(() => status.textContent = '', 3000);
}

function clearForm() {
  document.getElementById('newId').value = '';
  document.getElementById('newTitle').value = '';
  document.getElementById('newContent').value = '';
}

// ============ 删除章节 ============
async function deleteChapter(id) {
  if (!confirm('确定删除章节 ' + id + '？此操作不可恢复。')) return;
  try {
    const list = chaptersCache.filter(c => c.id !== id);
    await writeFile('chapters.json', list, `删除章节：${id}`);
    await loadChapters();
  } catch (e) {
    alert('删除失败：' + e.message);
  }
}

// ============ 读取所有评论 ============
async function loadComments() {
  const res = await fetch('comments.json?t=' + Date.now());
  const all = await res.json();
  const box = document.getElementById('commentList');
  if (all.length === 0) {
    box.innerHTML = '<p style="color:#999;">还没有评论</p>';
    return;
  }
  // 按时间倒序
  const sorted = all.slice().sort((a, b) => new Date(b.time) - new Date(a.time));
  box.innerHTML = sorted.map(c => `
    <div class="comment-item">
      <div class="meta">
        章节 ${escapeHtml(c.chapterId)} ·
        <b>${escapeHtml(c.nickname)}</b> ·
        ${new Date(c.time).toLocaleString('zh-CN')}
      </div>
      <div>${escapeHtml(c.content)}</div>
    </div>
  `).join('');
}

// ============ 写文件到 GitHub ============
async function writeFile(path, data, message) {
  const { owner, repo, token } = GITHUB_CONFIG;
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // 拿当前 sha
  const getRes = await fetch(api + '?t=' + Date.now(), {
    headers: { Authorization: `token ${token}` }
  });
  if (!getRes.ok) throw new Error('读取失败 ' + getRes.status);
  const file = await getRes.json();

  // 提交
  const putRes = await fetch(api, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      sha: file.sha
    })
  });
  if (!putRes.ok) throw new Error('写入失败 ' + putRes.status);
}

// ============ 防 XSS ============
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}