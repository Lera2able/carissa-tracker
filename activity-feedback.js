(function(){
  const RESULT_TYPE = 'assignment_activity_result';
  const STORAGE_KEY = 'carissa_assignment_result_pending';
  const qs = new URLSearchParams(window.location.search);
  const assignmentId = qs.get('assignment_id') || '';
  const grade = qs.get('grade') || '';
  const openedFromTracker = !!assignmentId;

  function buildPayload(partial){
    const data = partial || {};
    return {
      type: RESULT_TYPE,
      assignment_id: assignmentId,
      grade: data.grade || grade || '',
      activity_title: data.activity_title || document.title || 'Learner Activity',
      wpm: Number(data.wpm || 0),
      accuracy: Number(data.accuracy || 0),
      typed_chars: Number(data.typed_chars || 0),
      errors: Number(data.errors || 0),
      duration_sec: Number(data.duration_sec || 0),
      stars: Number(data.stars || 0),
      time_label: data.time_label || '',
      result_summary: String(data.result_summary || '').trim(),
      raw_result: data.raw_result || null,
    };
  }

  function sendResult(partial){
    if(!openedFromTracker) return { ok:false, reason:'not_assignment' };
    const payload = buildPayload(partial);
    try{
      if(window.opener){
        window.opener.postMessage(payload, window.location.origin);
        return { ok:true, method:'postMessage', payload };
      }
    }catch(_e){}
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return { ok:true, method:'localStorage', payload };
    }catch(_e){
      return { ok:false, reason:'send_failed', payload };
    }
  }

  window.CarissaActivityFeedback = {
    RESULT_TYPE,
    STORAGE_KEY,
    assignmentId,
    grade,
    openedFromTracker,
    buildPayload,
    sendResult,
  };
})();

