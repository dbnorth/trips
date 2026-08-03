import { ref } from "vue";
import { VERSION_RELOAD_MESSAGE, isVersionConflict } from "./versionConflict.js";

export const useVersionConflictForm = () => {
  const formError = ref("");
  const formNotice = ref("");

  const resetFormMessages = () => {
    formError.value = "";
    formNotice.value = "";
  };

  const prepareSave = () => {
    formError.value = "";
    formNotice.value = "";
  };

  const onLoadStart = ({ afterConflict = false } = {}) => {
    if (!afterConflict) resetFormMessages();
  };

  const onLoadSuccess = ({ afterConflict = false } = {}) => {
    if (afterConflict) {
      formNotice.value = VERSION_RELOAD_MESSAGE;
      formError.value = "";
    }
  };

  const handleSaveError = async (error, reloadFn, fallbackMessage = "Error saving.") => {
    if (isVersionConflict(error)) {
      await reloadFn({ afterConflict: true });
      return;
    }
    formError.value = error.response?.data?.message || fallbackMessage;
  };

  return {
    formError,
    formNotice,
    resetFormMessages,
    prepareSave,
    onLoadStart,
    onLoadSuccess,
    handleSaveError,
  };
};
