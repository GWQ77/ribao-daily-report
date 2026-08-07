<script setup lang="ts">
import { ref } from 'vue'
import {
  NRadioGroup,
  NRadioButton,
  NInputNumber,
  NInput,
  NButton,
  NIcon,
  NPopconfirm,
  useMessage,
  useDialog,
} from 'naive-ui'
import { AddOutline, ArrowForwardOutline, ChatbubbleEllipsesOutline, CloudDownloadOutline, CloudUploadOutline, ColorPaletteOutline, DocumentTextOutline, FlashOutline, FolderOutline, TimerOutline, TrashOutline } from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings'
import { useDiaryStore } from '../stores/diary'
import { saveTextFile, pickTextFile, backupJson, parseRestore } from '../services/export'
import type { ProjectRule } from '../types'

const settings = useSettingsStore()
const diary = useDiaryStore()
const message = useMessage()
const dialog = useDialog()

/* ---------- 备份 / 还原 ---------- */
async function doBackup() {
  const diaries = diary.allDiaries
  if (!diaries.length) {
    message.info('还没有日记可备份')
    return
  }
  const ok = await saveTextFile(backupJson(diaries), `日报备份-${new Date().toISOString().slice(0, 10)}.json`)
  if (ok) message.success('备份已导出')
}
async function doRestore() {
  const text = await pickTextFile()
  if (text === null) return
  try {
    const diaries = parseRestore(text)
    if (!diaries.length) {
      message.warning('备份文件里没有日记')
      return
    }
    dialog.warning({
      title: '确认还原',
      content: `将导入 ${diaries.length} 篇日记，同日期日记会被覆盖。确定继续吗？`,
      positiveText: '还原',
      negativeText: '取消',
      onPositiveClick: async () => {
        await diary.backend!.importAll(diaries)
        await diary.reload()
        await diary.goToDate(diary.date)
        message.success(`已还原 ${diaries.length} 篇日记`)
      },
    })
  } catch (e) {
    message.error((e as Error).message || '还原失败')
  }
}

/* ---------- 保存提示 ---------- */
function setSnooze(v: number | null) {
  if (v && v > 0) void settings.setSnooze(v)
}

/* ---------- 周报姓名 ---------- */
function setName(v: string) {
  settings.settings.name = v
  void settings.save()
}

/* ---------- 项目归类规则 ---------- */
const ruleIndex = ref(-1)
const ruleForm = ref<ProjectRule | null>(null)

function startEditRule(i: number) {
  const rules = settings.settings.projectRules
  ruleIndex.value = i
  ruleForm.value = i >= 0 ? { ...rules[i] } : { keyword: '', project: '' }
}

function saveRule() {
  if (!ruleForm.value) return
  const keyword = ruleForm.value.keyword.trim()
  const project = ruleForm.value.project.trim()
  if (!keyword || !project) {
    message.warning('关键词和项目名都不能为空')
    return
  }
  const rule: ProjectRule = { keyword, project }
  if (ruleIndex.value >= 0) settings.settings.projectRules[ruleIndex.value] = rule
  else settings.settings.projectRules.push(rule)
  void settings.save()
  ruleForm.value = null
  message.success('规则已保存')
}

function removeRule(i: number) {
  settings.settings.projectRules.splice(i, 1)
  void settings.save()
}

/* ---------- 常用短语 ---------- */
const newPhrase = ref('')

function addPhrase() {
  const p = newPhrase.value.trim()
  if (!p) return
  settings.settings.quickPhrases.push(p)
  void settings.save()
  newPhrase.value = ''
}

function removePhrase(i: number) {
  settings.settings.quickPhrases.splice(i, 1)
  void settings.save()
}
</script>

<template>
  <div class="settings-view">
    <!-- 外观 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="ColorPaletteOutline" :size="18" class="set-icon" />
        <h3>外观</h3>
      </div>
      <div class="set-body">
        <div class="set-row">
          <span class="set-label">主题模式</span>
          <n-radio-group :value="settings.settings.theme" @update:value="settings.setTheme">
            <n-radio-button value="auto">跟随系统</n-radio-button>
            <n-radio-button value="light">浅色</n-radio-button>
            <n-radio-button value="dark">深色</n-radio-button>
          </n-radio-group>
        </div>
      </div>
    </section>

    <!-- 提醒 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="TimerOutline" :size="18" class="set-icon" />
        <h3>提醒</h3>
      </div>
      <div class="set-body">
        <div class="set-row">
          <span class="set-label">稍后提醒间隔</span>
          <div class="set-control">
            <n-input-number
              :value="settings.settings.snoozeMinutes"
              :min="5"
              :max="240"
              :step="5"
              size="small"
              @update:value="setSnooze"
            />
            <span class="set-unit">分钟</span>
          </div>
        </div>
        <div class="set-desc">
          启动时若今天未写日记会提示；点「稍后提醒」将按此间隔定时通知。
        </div>
      </div>
    </section>

    <!-- 周报 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="DocumentTextOutline" :size="18" class="set-icon" />
        <h3>周报</h3>
        <span class="set-hint">导出 Excel 时填入「人员姓名」列与文件名</span>
      </div>
      <div class="set-body">
        <div class="set-row">
          <span class="set-label">姓名</span>
          <n-input
            :value="settings.settings.name"
            placeholder="留空则不填姓名"
            style="max-width: 260px"
            @update:value="setName"
          />
        </div>
      </div>
    </section>

    <!-- 项目归类 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="FolderOutline" :size="18" class="set-icon" />
        <h3>项目归类</h3>
        <span class="set-hint">导出周报时按关键词自动归类，无需在日报里标注</span>
      </div>
      <div class="set-body">
        <div class="rule-list" v-if="settings.settings.projectRules.length">
          <div v-for="(r, i) in settings.settings.projectRules" :key="i" class="rule-item">
            <span class="rule-kw">{{ r.keyword }}</span>
            <n-icon :component="ArrowForwardOutline" :size="14" class="rule-arrow" />
            <span class="rule-project">{{ r.project }}</span>
            <div class="rule-actions">
              <n-button size="tiny" quaternary @click="startEditRule(i)">编辑</n-button>
              <n-popconfirm
                :positive-text="'删除'"
                negative-text="取消"
                @positive-click="removeRule(i)"
              >
                <template #trigger>
                  <n-button size="tiny" quaternary type="error">
                    <template #icon><n-icon :component="TrashOutline" :size="14" /></template>
                  </n-button>
                </template>
                删除规则「{{ r.keyword }} → {{ r.project }}」？
              </n-popconfirm>
            </div>
          </div>
        </div>
        <div v-else class="set-desc">暂无规则，未标注的日报将归入「其他项目」。</div>
        <n-button size="small" secondary class="set-add-btn" @click="startEditRule(-1)">
          <template #icon><n-icon :component="AddOutline" /></template>
          添加规则
        </n-button>
      </div>
    </section>

    <!-- 常用短语 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="ChatbubbleEllipsesOutline" :size="18" class="set-icon" />
        <h3>常用短语</h3>
        <span class="set-hint">写日报时点「短语」一键插入</span>
      </div>
      <div class="set-body">
        <div class="phrase-list" v-if="settings.settings.quickPhrases.length">
          <div v-for="(p, i) in settings.settings.quickPhrases" :key="i" class="phrase-item">
            <span class="phrase-text">{{ p }}</span>
            <n-popconfirm
              :positive-text="'删除'"
              negative-text="取消"
              @positive-click="removePhrase(i)"
            >
              <template #trigger>
                <button class="phrase-del" title="删除">
                  <n-icon :component="TrashOutline" :size="13" />
                </button>
              </template>
              删除这条短语？
            </n-popconfirm>
          </div>
        </div>
        <div class="phrase-add">
          <n-input
            v-model:value="newPhrase"
            placeholder="输入常用短语，回车添加"
            style="flex: 1"
            @keydown.enter="addPhrase"
          />
          <n-button size="small" secondary @click="addPhrase">添加</n-button>
        </div>
      </div>
    </section>

    <!-- 快捷键 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="FlashOutline" :size="18" class="set-icon" />
        <h3>快捷键</h3>
        <span class="set-hint">写日报页有效</span>
      </div>
      <div class="set-body">
        <div class="hotkey-list">
          <div class="hotkey-item"><span class="hotkey-keys">Ctrl + S</span><span>立即保存</span></div>
          <div class="hotkey-item"><span class="hotkey-keys">Ctrl + Enter</span><span>保存并跳到下一天</span></div>
          <div class="hotkey-item"><span class="hotkey-keys">Alt + ← / →</span><span>前一天 / 后一天</span></div>
          <div class="hotkey-item"><span class="hotkey-keys">Alt + P</span><span>编辑 / 预览切换</span></div>
        </div>
      </div>
    </section>

    <!-- 备份 -->
    <section class="set-card app-card">
      <div class="set-head">
        <n-icon :component="CloudUploadOutline" :size="18" class="set-icon" />
        <h3>数据备份</h3>
      </div>
      <div class="set-body">
        <div class="set-row gap">
          <n-button secondary @click="doBackup">
            <template #icon><n-icon :component="CloudDownloadOutline" /></template>
            备份为 JSON
          </n-button>
          <n-button secondary type="warning" @click="doRestore">
            <template #icon><n-icon :component="CloudUploadOutline" /></template>
            从 JSON 还原
          </n-button>
        </div>
        <div class="set-desc">
          数据保存在 exe 同级 <code>data/diary.db</code>，建议定期备份。还原会覆盖同日期日记。
        </div>
      </div>
    </section>

    <!-- 规则编辑弹层 -->
    <n-modal
      :show="ruleForm !== null"
      preset="card"
      title="项目归类规则"
      :mask-closable="false"
      style="width: 420px"
      @update:show="(v: boolean) => !v && (ruleForm = null)"
    >
      <div v-if="ruleForm" class="rule-form">
        <div class="rule-form-row">
          <span class="rule-form-label">关键词</span>
          <n-input v-model:value="ruleForm.keyword" placeholder="如：燃气" style="flex: 1" />
        </div>
        <div class="rule-form-row">
          <span class="rule-form-label">项目名</span>
          <n-input v-model:value="ruleForm.project" placeholder="如：燃气项目" style="flex: 1" />
        </div>
        <div class="set-desc">日报内容包含关键词时，自动归入该项目。</div>
      </div>
      <template #footer>
        <div class="rule-form-actions">
          <n-button quaternary @click="ruleForm = null">取消</n-button>
          <n-button type="primary" @click="saveRule">保存</n-button>
        </div>
      </template>
    </n-modal>

  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.set-card {
  padding: 18px 22px;
}
.set-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.set-icon {
  color: var(--accent);
}
.set-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.set-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.set-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.set-row.gap {
  gap: 10px;
}
.set-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  min-width: 96px;
}
.set-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.set-unit {
  font-size: 12px;
  color: var(--text-3);
}
.set-desc {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
}
.set-desc code {
  font-family: var(--font-mono);
  background: var(--bg-inset);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}
.set-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}
.set-add-btn {
  align-self: flex-start;
}

/* 项目归类规则 */
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
}
.rule-kw {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
}
.rule-arrow {
  color: var(--text-3);
}
.rule-project {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-1);
}
.rule-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.rule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rule-form-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rule-form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  min-width: 56px;
}
.rule-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 常用短语 */
.phrase-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.phrase-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
}
.phrase-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-1);
  line-height: 1.5;
}
.phrase-del {
  border: none;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: all var(--dur-fast);
}
.phrase-del:hover {
  background: color-mix(in srgb, var(--red) 14%, transparent);
  color: var(--red);
}
.phrase-add {
  display: flex;
  gap: 8px;
}

/* 快捷键 */
.hotkey-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hotkey-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-2);
}
.hotkey-keys {
  min-width: 130px;
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--bg-inset);
  padding: 3px 10px;
  border-radius: 6px;
  color: var(--text-1);
  text-align: center;
}

</style>
