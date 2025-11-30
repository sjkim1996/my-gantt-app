'use client';

export const handlePdfUpload = async (
  file: File,
  setUrl: (v: string) => void,
  setName: (v: string) => void,
  setKey: (v: string) => void
) => {
  if (!file || file.type !== 'application/pdf') {
    alert('PDF 파일만 업로드 가능합니다.');
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    alert('PDF는 12MB 이하로 업로드해주세요.');
    return;
  }
  try {
    const presignRes = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok || !presignData?.success || !presignData.uploadUrl) {
      throw new Error(presignData?.error || 'Presign 요청 실패');
    }

    const uploadRes = await fetch(presignData.uploadUrl as string, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('S3 업로드 실패');

    setKey(presignData.key as string);
    setUrl(presignData.publicUrl as string);
    setName(file.name);
  } catch (err) {
    console.error('[PDF UPLOAD]', err);
    alert('파일 업로드에 실패했습니다. 잠시 후 다시 시도하세요.');
  }
};

export const getPresignedViewUrl = async (key: string) => {
  const res = await fetch('/api/uploads/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success || !data.downloadUrl) {
    throw new Error(data?.error || 'Presign GET 실패');
  }
  return data.downloadUrl as string;
};
