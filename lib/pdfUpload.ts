'use client';

export type UploadResult = { name: string; url: string; key: string };

export const uploadPdf = async (file: File): Promise<UploadResult> => {
  if (!file) {
    throw new Error('파일을 선택해주세요.');
  }
  // 단일 PUT 업로드 최대 5GB까지 가능. 업종 특성상 대용량 허용.
  try {
    const contentType = file.type || 'application/octet-stream';
    const presignRes = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: contentType }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok || !presignData?.success || !presignData.uploadUrl) {
      throw new Error(presignData?.error || 'Presign 요청 실패');
    }

    const uploadRes = await fetch(presignData.uploadUrl as string, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('S3 업로드 실패');

    return { name: file.name, url: presignData.publicUrl as string, key: presignData.key as string };
  } catch (err) {
    console.error('[PDF UPLOAD]', err);
    const message = err instanceof Error ? err.message : '파일 업로드 실패';
    throw new Error(message);
  }
};

export const handlePdfUpload = async (
  file: File,
  setUrl: (v: string) => void,
  setName: (v: string) => void,
  setKey: (v: string) => void
) => {
  const res = await uploadPdf(file);
  setKey(res.key);
  setUrl(res.url);
  setName(res.name);
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
