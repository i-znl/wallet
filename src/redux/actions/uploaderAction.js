export const ADD_FILE = 'ADD_FILE'
export const DELETE_FILE = 'DELETE_FILE'
export const UPDATE_FILE = 'UPDATE_FILE'
export const UPDATE_UPLOAD_PROGRESS = 'UPDATE_UPLOAD_PROGRESS'
export const UPDATE_FILELIST = 'UPDATE_FILELIST'

function fileKeysFilter(file) {
  const { id, name, status, guid, remaning, size, blocks } = file
  return { id, name, status, guid, remaning, size, blocks }
}

export function addFile(file) {
  return {
    type: ADD_FILE,
    file: fileKeysFilter(file)
  };
};

export function deleteFile(fid) {
  return {
    type: DELETE_FILE,
    fid
  };
};

export function updateFile(file) {
  return {
    type: UPDATE_FILE,
    file: fileKeysFilter(file)
  };
};

export function updateUploadProgress(guid, percent) {
  return {
    type: UPDATE_UPLOAD_PROGRESS,
    guid, percent
  };
};

export function updateFileList(fileList) {
  return {
    type: UPDATE_FILELIST,
    fileList
  };
};
