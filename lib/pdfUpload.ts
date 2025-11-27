'use client';

export const handlePdfUpload = async (
  file: File,
  setUrl: (v: string) => void,
  setName: (v: string) => void
) => {
  if (!file || file.type !== 'application/pdf') {
    alert('PDF 파일만 업로드 가능합니다.');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert('PDF는 8MB 이하로 업로드해주세요.');
    return;
  }
  const readPdfAsDataUrl = (f: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
  try {
    const dataUrl = await readPdfAsDataUrl(file);
    setUrl(dataUrl);
    setName(file.name);
  } catch {
    alert('파일을 읽는 중 오류가 발생했습니다.');
  }
};
