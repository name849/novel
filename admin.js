// ============ 密码 ============
// 改成你自己的密码
const ADMIN_PASSWORD = 'chenjiayu9693';

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

if (sessionStorage.getItem('admin_ok') === '1') {
  showPanel();
}

document.getElementById('pwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

// ============ 工具：拉取最新数据（绕过缓存） ============
async function fetchFresh(path) {
  const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('读取失败 ' + res.status);
  return res.json();
}

// ============ 读取章节（显示在后台列表） ============
async function loadChapters() {
  try {
    const chapters = await fetchFresh('chapters.json');
    const box = document.getElementById('chapterList');
    if (chapters.length === 0) {
      box.innerHTML = '<p style="color:#999;">还没有章节</p>';
      return;
    }
    box.innerHTML = chapters.map(ch => `
      <div class="chapter-item">
        <div class="info">
          <a href="chapter.html?id=${ch.id}" target="_blank">${escapeHtml(ch.title)}</a>
          <div class="id">ID: ${escapeHtml(ch.id)}</div>
        </div>
        <button class="btn btn-danger" onclick="deleteChapter('${ch.id}')">删除</button>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('chapterList').innerHTML =
      '<p style="color:#c0392b;">加载失败：' + e.message + '</p>';
  }
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

  const btn = document.getElementById('publishBtn');
  const status = document.getElementById('publishStatus');
  btn.disabled = true;
  status.textContent = '发布中...';

  try {
    // ★ 关键：发布前重新拉取最新的 chapters.json，避免用旧数据覆盖
    const fresh = await fetchFresh('chapters.json');

    if (fresh.some(c => c.id === id)) {
      throw new Error('ID ' + id + ' 已经存在');
    }

    const newCh = { id, title, content, time: new Date().toISOString() };
    const list = fresh.concat([newCh]);

    await writeFile('chapters.json', list, `发布章节：${title}`);

    status.textContent = '✅ 发布成功';
    clearForm();
    await loadChapters();
  } catch (e) {
    status.textContent = '❌ 失败：' + e.message;
  }

  btn.disabled = false;
  setTimeout(() => status.textContent = '', 4000);
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
    // ★ 同样：删除前重新拉取
    const fresh = await fetchFresh('chapters.json');
    const list = fresh.filter(c => c.id !== id);
    await writeFile('chapters.json', list, `删除章节：${id}`);
    await loadChapters();
  } catch (e) {
    alert('删除失败：' + e.message);
  }
}

// ============ 读取所有评论 ============
async function loadComments() {
  try {
    const all = await fetchFresh('comments.json');
    const box = document.getElementById('commentList');
    if (all.length === 0) {
      box.innerHTML = '<p style="color:#999;">还没有评论</p>';
      return;
    }
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
  } catch (e) {
    document.getElementById('commentList').innerHTML =
      '<p style="color:#c0392b;">加载失败：' + e.message + '</p>';
  }
}

// ============ 写文件到 GitHub（带自动重试） ============
async function writeFile(path, data, message, retries = 3) {
  const { owner, repo, token } = GITHUB_CONFIG;
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      // 每次重试都重新拿 sha
      const getRes = await fetch(api + '?t=' + Date.now(), {
        headers: { Authorization: `token ${token}` }
      });
      if (!getRes.ok) throw new Error('读取失败 ' + getRes.status);
      const file = await getRes.json();

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
      return; // 成功
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) {
        // 等 1.5 秒重试
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }
  throw lastErr;
}

// ============ 防 XSS ============
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}