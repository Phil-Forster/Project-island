(() => {
  const $ = (id) => document.getElementById(id);
  const panels = [...document.querySelectorAll('.state-panel')];
  const shell = $('shell');
  const primaryBtn = $('primaryBtn');
  const secondaryBtn = $('secondaryBtn');
  const browseBtn = $('browseBtn');
  const installPath = $('installPath');
  const launchToggle = $('launchToggle');
  const windowClose = $('windowClose');
  const folderPicker = $('folderPicker');
  const folderPickerPath = $('folderPickerPath');
  const folderPickerList = $('folderPickerList');
  const folderPickerMessage = $('folderPickerMessage');
  const folderPickerUp = $('folderPickerUp');
  const folderPickerGo = $('folderPickerGo');
  const folderPickerUse = $('folderPickerUse');
  const folderPickerCancel = $('folderPickerCancel');
  const folderPickerClose = $('folderPickerClose');

  let context;
  let state = 'ready';
  let launchAfter = true;
  let progressValue = 0;
  let progressTimer = null;
  let pickerCurrent = '';
  let pickerParent = null;
  let pickerPreviousFocus = null;

  async function getContext() {
    if (window.deployment) return window.deployment.getContext();
    const response = await fetch('project.json');
    const project = await response.json();
    const params = new URLSearchParams(location.search);
    return {
      project,
      mode: params.get('mode') === 'uninstall' ? 'uninstall' : 'install',
      version: project.version || 'preview',
      installDir: `C:\\Users\\CurrentUser\\AppData\\Local\\Programs\\${project.installFolderName}`,
      preview: true,
    };
  }

  function applyProject(project) {
    const root = document.documentElement.style;
    root.setProperty('--accent', project.accent);
    root.setProperty('--accent-bright', project.accentBright);
    root.setProperty('--accent-dim', project.accentDim);
    document.title = `${project.projectName} ${context.mode === 'uninstall' ? 'Uninstaller' : 'Setup'}`;
    $('projectName').textContent = project.projectName;
    $('gameName').textContent = `${project.gameName} · Achievement Tracker`;
    $('readyEyebrow').textContent = project.copy.readyEyebrow;
    $('readyTitle').textContent = project.copy.readyTitle;
    $('readyBody').textContent = project.copy.readyBody;
    $('readyNote').textContent = project.copy.readyNote;
    $('installingTitle').textContent = `Installing ${project.projectName}`;
    $('completeTitle').textContent = `${project.projectName} is installed`;
    $('completeBody').textContent = project.copy.completeBody;
    $('launchLabel').textContent = `Launch ${project.projectName}`;
    $('removeTitle').textContent = `Uninstall ${project.projectName}`;
    $('removeBody').textContent = project.copy.removeBody;
    $('removingTitle').textContent = `Removing ${project.projectName}`;
    $('uninstallCompleteTitle').textContent = `${project.projectName} removed`;
    $('uninstallCompleteBody').textContent = project.copy.uninstallCompleteBody;
    $('visualCode').textContent = project.visual.code;
    $('visualMotif').textContent = project.visual.motif;
    $('visualCaption').textContent = project.visual.caption;
    $('visualCoordinate').textContent = project.visual.coordinate;
    $('versionLabel').textContent = `v${context.version}`;
    installPath.value = context.installDir;

    const steps = project.copy.steps || ['Prepare', 'Deploy', 'Register', 'Finalise'];
    $('progressSteps').innerHTML = steps.map((step, index) => `<span class="progress-step" data-step="${index}">${step}</span>`).join('');
  }

  function setState(next) {
    state = next;
    secondaryBtn.disabled = false;
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.state === next));
    const busy = next === 'installing' || next === 'removing';
    browseBtn.disabled = busy;
    windowClose.disabled = busy;
    secondaryBtn.disabled = busy;

    if (next === 'ready') {
      primaryBtn.textContent = 'Install';
      secondaryBtn.textContent = 'Cancel';
      primaryBtn.disabled = false;
      secondaryBtn.style.display = '';
    } else if (next === 'installing') {
      primaryBtn.textContent = 'Installing…';
      primaryBtn.disabled = true;
      secondaryBtn.textContent = 'Please wait';
      secondaryBtn.disabled = true;
    } else if (next === 'complete') {
      primaryBtn.textContent = 'Finish';
      primaryBtn.disabled = false;
      secondaryBtn.style.display = 'none';
    } else if (next === 'confirm-uninstall') {
      primaryBtn.textContent = 'Uninstall';
      primaryBtn.disabled = false;
      secondaryBtn.textContent = 'Cancel';
      secondaryBtn.style.display = '';
    } else if (next === 'removing') {
      primaryBtn.textContent = 'Removing…';
      primaryBtn.disabled = true;
      secondaryBtn.textContent = 'Please wait';
      secondaryBtn.disabled = true;
    } else if (next === 'uninstall-complete') {
      primaryBtn.textContent = 'Close';
      primaryBtn.disabled = false;
      secondaryBtn.style.display = 'none';
    } else if (next === 'error') {
      primaryBtn.textContent = context.mode === 'uninstall' ? 'Try Again' : 'Try Again';
      primaryBtn.disabled = false;
      secondaryBtn.textContent = 'Close';
      secondaryBtn.style.display = '';
    }
  }

  function setProgress(value, status, removing = false) {
    progressValue = Math.max(0, Math.min(100, value));
    const fill = removing ? $('removeProgressFill') : $('progressFill');
    const percent = removing ? $('removeProgressPercent') : $('progressPercent');
    const track = removing ? $('removeProgressTrack') : $('progressTrack');
    const statusEl = removing ? $('removeProgressStatus') : $('progressStatus');
    fill.style.width = `${progressValue}%`;
    percent.textContent = `${Math.round(progressValue)}%`;
    track.setAttribute('aria-valuenow', String(Math.round(progressValue)));
    if (status) statusEl.textContent = status;
    if (!removing) {
      const index = progressValue < 20 ? 0 : progressValue < 58 ? 1 : progressValue < 88 ? 2 : 3;
      document.querySelectorAll('.progress-step').forEach((step, i) => {
        step.classList.toggle('is-active', i === index);
        step.classList.toggle('is-done', i < index);
      });
    }
  }

  function beginCreep(removing = false) {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      const ceiling = removing ? 91 : 89;
      if (progressValue < ceiling) {
        const bump = progressValue < 25 ? 2.4 : progressValue < 65 ? 1.15 : .38;
        setProgress(progressValue + bump, null, removing);
      }
    }, 420);
  }

  function stopCreep() {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  function showError(result) {
    stopCreep();
    $('errorTitle').textContent = 'The deployment did not complete';
    $('errorBody').textContent = 'The installer shell is still open and no further action will be taken until you retry or close it.';
    $('errorDetail').textContent = result?.message || `Deployment engine exit code: ${result?.code ?? 'unknown'}`;
    setState('error');
  }

  async function runInstall() {
    setState('installing');
    progressValue = 0;
    setProgress(5, 'Preparing deployment engine');
    beginCreep(false);
    if (context.preview) {
      setTimeout(() => { stopCreep(); setProgress(100, 'Installation complete'); setState('complete'); }, 1800);
      return;
    }
    const result = await window.deployment.install(installPath.value);
    if (!result?.ok) return showError(result);
    stopCreep();
    setProgress(100, 'Installation complete');
    setTimeout(() => setState('complete'), 350);
  }

  async function runUninstall() {
    setState('removing');
    progressValue = 0;
    setProgress(7, 'Preparing removal', true);
    beginCreep(true);
    if (context.preview) {
      setTimeout(() => { stopCreep(); setProgress(100, 'Removal complete', true); setState('uninstall-complete'); }, 1700);
      return;
    }
    const result = await window.deployment.uninstall();
    if (!result?.ok) return showError(result);
    stopCreep();
    setProgress(100, 'Removal complete', true);
    setTimeout(() => setState('uninstall-complete'), 350);
  }

  primaryBtn.addEventListener('click', async () => {
    if (state === 'ready') return runInstall();
    if (state === 'confirm-uninstall') return runUninstall();
    if (state === 'complete') {
      if (launchAfter && !context.preview) await window.deployment.launch();
      if (!context.preview) await window.deployment.close();
      return;
    }
    if (state === 'uninstall-complete') {
      if (!context.preview) await window.deployment.close();
      return;
    }
    if (state === 'error') {
      return context.mode === 'uninstall' ? runUninstall() : runInstall();
    }
  });

  secondaryBtn.addEventListener('click', async () => {
    if (context.preview) return;
    await window.deployment.close();
  });
  windowClose.addEventListener('click', async () => {
    if (state === 'installing' || state === 'removing') return;
    if (!context.preview) await window.deployment.close();
  });
  function pickerButton(label, value, kind = 'folder') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'folder-entry';
    button.setAttribute('role', 'option');
    button.dataset.value = value;
    const icon = document.createElement('span');
    icon.className = 'folder-entry-icon';
    icon.textContent = kind === 'root' ? '◇' : '⌑';
    const copy = document.createElement('span');
    copy.textContent = label;
    button.append(icon, copy);
    button.addEventListener('dblclick', () => loadPicker(value));
    button.addEventListener('click', () => {
      folderPickerList.querySelectorAll('.folder-entry').forEach((entry) => entry.classList.remove('is-selected'));
      button.classList.add('is-selected');
      folderPickerPath.value = value;
    });
    return button;
  }

  async function loadPicker(requestedPath) {
    if (context.preview || !window.deployment) return;
    folderPickerMessage.textContent = 'Loading folders…';
    const result = await window.deployment.listDirectory(requestedPath || '');
    folderPickerList.replaceChildren();
    if (!result?.ok) {
      folderPickerMessage.textContent = result?.message || 'This folder cannot be opened.';
      return;
    }
    pickerCurrent = result.current || '';
    pickerParent = result.parent || null;
    folderPickerPath.value = pickerCurrent || '';
    folderPickerUp.disabled = !pickerParent && !(result.roots?.length === 0 && pickerCurrent);
    if (result.roots?.length) {
      result.roots.forEach((root) => folderPickerList.appendChild(pickerButton(root, root, 'root')));
    } else {
      result.entries.forEach((name) => {
        const target = pickerCurrent ? `${pickerCurrent.replace(/[\\/]$/, '')}${pickerCurrent.includes('\\') ? '\\' : '/'}${name}` : name;
        folderPickerList.appendChild(pickerButton(name, target));
      });
    }
    folderPickerMessage.textContent = folderPickerList.childElementCount ? '' : 'No subfolders are available here.';
  }

  async function openPicker() {
    pickerPreviousFocus = document.activeElement;
    folderPicker.hidden = false;
    shell.setAttribute('aria-hidden', 'true');
    await loadPicker(installPath.value.trim());
    folderPickerPath.focus();
    folderPickerPath.select();
  }

  function closePicker() {
    folderPicker.hidden = true;
    shell.removeAttribute('aria-hidden');
    folderPickerMessage.textContent = '';
    if (pickerPreviousFocus?.focus) pickerPreviousFocus.focus();
  }

  browseBtn.addEventListener('click', () => openPicker());
  folderPickerCancel.addEventListener('click', closePicker);
  folderPickerClose.addEventListener('click', closePicker);
  folderPickerUse.addEventListener('click', () => {
    const chosen = folderPickerPath.value.trim() || pickerCurrent;
    if (chosen) installPath.value = chosen;
    closePicker();
  });
  folderPickerGo.addEventListener('click', () => loadPicker(folderPickerPath.value.trim()));
  folderPickerPath.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadPicker(folderPickerPath.value.trim());
  });
  folderPickerUp.addEventListener('click', () => loadPicker(pickerParent || ''));
  folderPicker.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePicker();
  });
  launchToggle.addEventListener('click', () => {
    launchAfter = !launchAfter;
    launchToggle.setAttribute('aria-checked', String(launchAfter));
  });

  async function init() {
    context = await getContext();
    applyProject(context.project);
    setState(context.mode === 'uninstall' ? 'confirm-uninstall' : 'ready');
    if (window.deployment) {
      window.deployment.onPhase((payload) => {
        if (!payload) return;
        const removing = state === 'removing';
        if (payload.progress != null) setProgress(Math.max(progressValue, payload.progress), payload.label, removing);
        else if (payload.label) (removing ? $('removeProgressStatus') : $('progressStatus')).textContent = payload.label;
      });
    }
  }

  init().catch((error) => {
    console.error(error);
    document.body.innerHTML = `<pre style="padding:24px;color:#fff">${String(error?.stack || error)}</pre>`;
  });
})();
