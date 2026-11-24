import { useState } from 'react';
import { FileUp, Link2, NotebookText, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { lockerApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { Button, Field, Input, Modal, Select, Tabs, cx } from '../ui/index.jsx';
import MarkdownEditor from './MarkdownEditor.jsx';
import { formatFileSize } from '../../utils/format.js';

const MAX_MB = 15;
const ACCEPT = '.pdf,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp';

const blank = { title: '', folderName: '', visibility: 'ENROLLED_ONLY', contentMarkdown: '', fileUrl: '', file: null };

export default function AddItemModal({ open, onClose, spaceId, folders = [], onCreated }) {
  const [kind, setKind] = useState('note');
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const close = () => {
    if (saving) return;
    setForm(blank);
    setProgress(0);
    onClose();
  };

  const pickFile = (file) => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Files must be under ${MAX_MB} MB`);
    setForm((f) => ({ ...f, file, title: f.title || file.name.replace(/\.[^.]+$/, '') }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const common = { title: form.title, folderName: form.folderName.trim() || 'General', visibility: form.visibility };
    let payload;
    if (kind === 'note') {
      if (!form.contentMarkdown.trim()) return toast.error('Write something in the note first');
      payload = { ...common, itemType: 'RICH_NOTE', contentMarkdown: form.contentMarkdown };
    } else if (kind === 'link') {
      payload = { ...common, itemType: 'EXTERNAL_LINK', fileUrl: form.fileUrl.trim() };
    } else {
      if (!form.file) return toast.error('Choose a file to upload');
      payload = new FormData();
      Object.entries(common).forEach(([k, v]) => payload.append(k, v));
      payload.append('file', form.file);
    }

    setSaving(true);
    try {
      const { item } = await lockerApi.create(spaceId, payload, (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)));
      toast.success('Added to locker');
      onCreated(item);
      setForm(blank);
      setProgress(0);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Add to Notes Locker"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="submit" form="add-item" loading={saving}>
            {saving && kind === 'file' && progress < 100 ? `Uploading ${progress}%` : 'Save'}
          </Button>
        </>
      }
    >
      <Tabs
        className="mb-4"
        value={kind}
        onChange={setKind}
        tabs={[
          { value: 'note', label: 'Note', icon: NotebookText },
          { value: 'file', label: 'File', icon: FileUp },
          { value: 'link', label: 'Link', icon: Link2 },
        ]}
      />
      <form id="add-item" onSubmit={submit} className="space-y-4">
        <Field label="Title">
          {(id) => <Input id={id} required maxLength={160} value={form.title} onChange={set('title')} placeholder="Chapter 4 – Laws of Motion" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Folder" hint="Leave empty for General">
            {(id) => (
              <>
                <Input id={id} list="locker-folders" maxLength={60} value={form.folderName} onChange={set('folderName')} placeholder="General" />
                <datalist id="locker-folders">
                  {folders.map((f) => <option key={f} value={f} />)}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Who can see it">
            {(id) => (
              <Select id={id} value={form.visibility} onChange={set('visibility')}>
                <option value="PUBLIC">Public – anyone, incl. your profile</option>
                <option value="ENROLLED_ONLY">Enrolled students only</option>
                <option value="PRIVATE">Private – only me</option>
              </Select>
            )}
          </Field>
        </div>

        {kind === 'note' && (
          <MarkdownEditor
            value={form.contentMarkdown}
            onChange={(v) => setForm((f) => ({ ...f, contentMarkdown: v }))}
            placeholder={'## Key ideas\n\n- Newton\'s first law: ...\n- **F = ma**'}
          />
        )}

        {kind === 'link' && (
          <Field label="URL" hint="YouTube video, Google Drive file, simulation...">
            {(id) => <Input id={id} type="url" required value={form.fileUrl} onChange={set('fileUrl')} placeholder="https://" />}
          </Field>
        )}

        {kind === 'file' && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
              form.file ? 'border-indigo-300 bg-indigo-50/50' : 'border-zinc-300 hover:border-zinc-400',
            )}
          >
            <UploadCloud className="mb-2 size-7 text-zinc-400" />
            {form.file ? (
              <>
                <span className="text-sm font-medium">{form.file.name}</span>
                <span className="text-xs text-zinc-500">{formatFileSize(Math.ceil(form.file.size / 1024))} · click to change</span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">Drop a file or click to browse</span>
                <span className="text-xs text-zinc-500">PDF, PPT/PPTX or image · up to {MAX_MB} MB</span>
              </>
            )}
            <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
        )}
      </form>
    </Modal>
  );
}
