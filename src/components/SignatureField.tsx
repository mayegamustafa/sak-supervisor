'use client';

import { useState } from 'react';
import SignaturePad from './SignaturePad';
import SignatureScanner from './SignatureScanner';

interface Props {
  label: string;
  /** Current signature image (transparent PNG data URL), or '' if none. */
  value: string;
  onChange: (dataUrl: string) => void;
  /** The signer's own saved signature — enables one-tap "Use my signature". */
  savedSignature?: string;
  /** Helper text under the label. */
  hint?: string;
}

type Editor = 'draw' | 'camera' | 'gallery' | null;

/**
 * A signature line with a set of ways to fill it in: attach a saved signature,
 * draw one, scan one from the camera, or upload an image. Renders the chosen
 * signature sitting on the line, with options to change or clear it.
 */
export default function SignatureField({ label, value, onChange, savedSignature, hint }: Props) {
  const [menu, setMenu] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);

  function pick(dataUrl: string) {
    onChange(dataUrl);
    setEditor(null);
    setMenu(false);
  }

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>}
      {hint && <p className="mb-2 text-xs text-gray-400">{hint}</p>}

      {/* Signature line */}
      <div className="rounded-xl border border-gray-300 bg-white p-3">
        <div className="flex h-16 items-end justify-center border-b-2 border-gray-300">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="max-h-14 max-w-full object-contain" />
          ) : (
            <span className="mb-1 text-xs italic text-gray-400">No signature yet</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white active:bg-gray-900"
          >
            {value ? 'Change signature' : 'Add signature'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>

        {/* Options */}
        {menu && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {savedSignature && (
              <button
                type="button"
                onClick={() => pick(savedSignature)}
                className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white active:bg-amber-600"
              >
                <PenIcon /> Use my saved signature
              </button>
            )}
            <SheetButton onClick={() => setEditor('camera')} icon={<CameraIcon />} text="Scan (Camera)" />
            <SheetButton onClick={() => setEditor('gallery')} icon={<PhotoIcon />} text="Upload image" />
            <SheetButton onClick={() => setEditor('draw')} icon={<DrawIcon />} text="Draw" />
            <SheetButton onClick={() => setMenu(false)} icon={<CloseIcon />} text="Cancel" />
          </div>
        )}
      </div>

      {editor === 'draw' && (
        <SignaturePad onSave={pick} onCancel={() => setEditor(null)} />
      )}
      {(editor === 'camera' || editor === 'gallery') && (
        <SignatureScanner initialSource={editor} onSave={pick} onCancel={() => setEditor(null)} />
      )}
    </div>
  );
}

function SheetButton({ onClick, icon, text }: { onClick: () => void; icon: React.ReactNode; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 active:bg-gray-100"
    >
      {icon} {text}
    </button>
  );
}

function iconCls() {
  return 'h-4 w-4';
}
function CameraIcon() {
  return (
    <svg className={iconCls()} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}
function PhotoIcon() {
  return (
    <svg className={iconCls()} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
    </svg>
  );
}
function DrawIcon() {
  return (
    <svg className={iconCls()} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg className={iconCls()} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zM19.5 7.125L16.875 4.5" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg className={iconCls()} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
