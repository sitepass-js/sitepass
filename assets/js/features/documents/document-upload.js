(function(){
  'use strict';

  var EQUIPMENT_DOCUMENT_KEYS = Object.freeze([
    'businessLicense',
    'equipmentRegistration',
    'equipmentInspection',
    'insurancePolicy',
    'specSheet',
    'ndtInspection',
    'equipmentLedger',
    'otherEquipment'
  ]);

  var ALLOWED_MIME = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]);

  function need(name){
    var fn=window[name];
    if(typeof fn!=='function')throw new Error('[SitePass Step81] document upload dependency unavailable: '+name);
    return fn;
  }

  function clean(value){
    return String(value || '').trim();
  }

  function clone(value){
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function placeholderFileName(value){
    var text=clean(value);
    if(!text)return true;
    return (
      /^첨부됨$/i.test(text) ||
      /^첨부\s*없음$/i.test(text) ||
      /^첨부\s*\d+장$/i.test(text) ||
      /^첨부\s*\d+장\s*[·-]\s*첨부됨$/i.test(text) ||
      /^첨부파일$/i.test(text)
    );
  }

  function objectHasRealAttachment(obj){
    obj=obj&&typeof obj==='object'?obj:{};
    var path=clean(
      obj.storagePath || obj.storage_path ||
      obj.objectPath || obj.object_path ||
      obj.filePath || obj.file_path
    ).replace(/^\/+/,'');
    if(path)return true;
    return [
      obj.previewDataUrl,obj.editDataUrl,obj.originalDataUrl,
      obj.correctedDataUrl,obj.fileDataUrl,obj.dataUrl,
      obj.fileObjectUrl,obj.blobUrl,obj.fileUrl,obj.downloadUrl,
      obj.signedUrl,obj.storageAccessUrl,obj.storagePublicUrl,
      obj.publicUrl
    ].some(function(value){return !!clean(value);});
  }

  function hasRealAttachment(doc){
    doc=doc&&typeof doc==='object'?doc:{};
    if(objectHasRealAttachment(doc))return true;
    var pages=Array.isArray(doc.pages)?doc.pages:[];
    if(pages.some(objectHasRealAttachment))return true;
    var name=clean(doc.fileName);
    return !!name && !placeholderFileName(name);
  }

  function normalizeMime(value,fileName){
    var mime=clean(value).toLowerCase();
    if(mime==='image/jpg')mime='image/jpeg';
    if(ALLOWED_MIME.indexOf(mime)>=0)return mime;
    var name=clean(fileName).toLowerCase();
    if(/\.pdf$/.test(name))return 'application/pdf';
    if(/\.png$/.test(name))return 'image/png';
    if(/\.webp$/.test(name))return 'image/webp';
    if(/\.(jpg|jpeg)$/.test(name))return 'image/jpeg';
    return mime;
  }

  function parseRpcData(data){
    var value=data;
    if(typeof value==='string'){
      try{value=JSON.parse(value);}catch(error){}
    }
    return value;
  }

  function parseRows(data){
    var value=parseRpcData(data);
    if(value && !Array.isArray(value) && Array.isArray(value.items))value=value.items;
    if(value && !Array.isArray(value) && Array.isArray(value.data))value=value.data;
    return Array.isArray(value)?value:[];
  }

  async function resolveEquipmentId(item){
    var direct=clean(item && (item.equipmentId || item.equipment_id));
    if(direct)return direct;

    var api=window.SitePassSupabaseApi;
    var code=clean(item && item.code);
    if(!api || typeof api.rpc!=='function' || !code)return '';

    if(typeof window.getSitePassMemberEquipmentRpcParamsV485!=='function')return '';
    var listed=await api.rpc(
      'sitepass_list_member_equipment_items_v485',
      window.getSitePassMemberEquipmentRpcParamsV485()
    );
    if(listed && listed.error)throw listed.error;

    var row=parseRows(listed && listed.data).find(function(candidate){
      var nested=candidate && (candidate.item_json || candidate.item_data || candidate.payload || candidate.data);
      if(typeof nested==='string'){try{nested=JSON.parse(nested);}catch(error){nested=null;}}
      return clean(candidate && candidate.code || nested && nested.code)===code;
    });
    return clean(row && row.equipment_id);
  }

  function blankGhostDoc(existing,key){
    var doc=existing&&typeof existing==='object'?Object.assign({},existing):{};
    doc.key=doc.key||key;
    doc.pages=[];
    doc.pageCount=0;
    doc.fileName='';
    [
      'storageBucket','storagePath','storage_bucket','storage_path',
      'previewDataUrl','editDataUrl','originalDataUrl','correctedDataUrl',
      'fileDataUrl','dataUrl','fileObjectUrl','blobUrl','fileUrl',
      'downloadUrl','signedUrl','storageAccessUrl','storagePublicUrl',
      'publicUrl'
    ].forEach(function(field){if(field in doc)doc[field]='';});
    delete doc.canonicalDocumentId;
    delete doc.canonicalCurrentVersionId;
    delete doc.canonicalVersionNo;
    return doc;
  }

  async function canonicalDocumentToUi(existing,canonical,options){
    options=options&&typeof options==='object'?options:{};
    var failClosedPrivate=options.failClosedPrivate===true;
    var api=window.SitePassSupabaseApi;
    var doc=existing&&typeof existing==='object'?Object.assign({},existing):{};
    var version=canonical && canonical.current_version && typeof canonical.current_version==='object'
      ? canonical.current_version
      : null;
    var files=version && Array.isArray(version.files)?version.files:[];
    var pages=[];

    for(var i=0;i<files.length;i++){
      var file=files[i]||{};
      var bucket=clean(file.storage_bucket || 'sitepass-documents');
      var path=clean(file.storage_path).replace(/^\/+/,'');
      var url='';
      if(api && typeof api.storageResolveUrl==='function' && bucket && path){
        url=await api.storageResolveUrl(bucket,path,{preferSigned:true,forceRefresh:true});
      }
      pages.push({
        id:'canonical_'+clean(file.file_id || (i+1)),
        canonicalFileId:clean(file.file_id),
        canonicalVersionId:clean(version && version.version_id),
        fileName:clean(file.original_file_name) || ('첨부파일 '+(i+1)),
        fileSource:'서버 현재서류',
        fileType:normalizeMime(file.mime_type,file.original_file_name),
        storageBucket:(failClosedPrivate && !url)?'':bucket,
        storagePath:(failClosedPrivate && !url)?'':path,
        signedUrl:url,
        storageAccessUrl:url,
        fileUrl:url,
        downloadUrl:url,
        previewDataUrl:url,
        editDataUrl:url,
        previewChoice:'storage',
        autoFit:'canonical-storage',
        sitePassRenewalNew:false,
        sitePassPrivateFailClosedV91:failClosedPrivate,
        addedAt:clean(file.created_at)
      });
    }

    doc.key=doc.key || clean(canonical && canonical.document_type);
    doc.groupKey=doc.groupKey || 'equipment';
    doc.required=canonical && typeof canonical.is_required==='boolean'
      ? canonical.is_required
      : !!doc.required;
    doc.pages=pages;
    doc.pageCount=pages.length;
    doc.fileName=pages.length
      ? ('첨부 '+pages.length+'장 · '+pages.map(function(page){return page.fileName;}).join(', '))
      : '';
    doc.fileType=pages[0] && pages[0].fileType || '';
    doc.storageBucket=pages[0] && pages[0].storageBucket || '';
    doc.storagePath=pages[0] && pages[0].storagePath || '';
    doc.signedUrl=pages[0] && pages[0].signedUrl || '';
    doc.storageAccessUrl=pages[0] && pages[0].storageAccessUrl || '';
    doc.fileUrl=pages[0] && pages[0].fileUrl || '';
    doc.downloadUrl=pages[0] && pages[0].downloadUrl || '';
    doc.previewDataUrl=pages[0] && pages[0].previewDataUrl || '';
    doc.editDataUrl=pages[0] && pages[0].editDataUrl || '';
    doc.expireDate=clean(version && version.expiry_date);
    doc.canonicalDocumentId=clean(canonical && canonical.document_id);
    doc.canonicalCurrentVersionId=clean(canonical && canonical.current_version_id);
    doc.canonicalVersionNo=Number(version && version.version_no || 0);
    doc.canonicalStatus=clean(canonical && canonical.status);
    doc.storageMode=pages.length?'supabase-storage-canonical-v5':'canonical-empty';
    if(failClosedPrivate){
      doc.sitePassPrivateFailClosedV91=true;
      doc.storagePublicUrl='';
      doc.publicUrl='';
      if(!doc.signedUrl){
        // Private 원본은 signed URL 실패 시 storagePath만으로 public URL을 재구성하지 않는다.
        doc.storageBucket='';
        doc.storagePath='';
      }
    }
    return doc;
  }

  async function hydrateActiveDocumentState(item){
    if(!item || typeof item!=='object')throw new Error('수정 대상 장비가 없습니다.');
    var api=window.SitePassSupabaseApi;
    if(!api || typeof api.rpc!=='function')throw new Error('Supabase RPC 연결이 없습니다.');

    var output=clone(item)||{};
    var equipmentId=await resolveEquipmentId(output);
    if(!equipmentId)throw new Error('현재 장비의 equipment_id를 정상 회원 RPC에서 확인하지 못했습니다.');

    var detailResult=await api.rpc('sitepass_get_equipment_detail_v1',{p_equipment_id:equipmentId});
    if(detailResult && detailResult.error)throw detailResult.error;
    var detail=parseRpcData(detailResult && detailResult.data);
    if(!detail || typeof detail!=='object')throw new Error('canonical 장비 상세 결과가 없습니다.');

    var equipment=detail.equipment&&typeof detail.equipment==='object'?detail.equipment:{};
    if(clean(equipment.equipment_id) && clean(equipment.equipment_id)!==equipmentId){
      throw new Error('canonical 장비 상세의 equipment_id가 일치하지 않습니다.');
    }
    if(clean(equipment.code) && clean(output.code) && clean(equipment.code)!==clean(output.code)){
      throw new Error('canonical 장비 상세의 code가 일치하지 않습니다.');
    }
    if(clean(equipment.lifecycle_status)!=='active'){
      throw new Error('현재 V5 갱신은 active 장비에서만 실행합니다.');
    }

    output.equipmentId=equipmentId;
    output.equipment_id=equipmentId;
    output.docs=output.docs&&typeof output.docs==='object'?clone(output.docs):{};

    var canonicalRows=Array.isArray(detail.documents)?detail.documents:[];
    var byType={};
    canonicalRows.forEach(function(row){
      var key=clean(row && row.document_type);
      if(key)byType[key]=row;
    });

    for(var k=0;k<EQUIPMENT_DOCUMENT_KEYS.length;k++){
      var key=EQUIPMENT_DOCUMENT_KEYS[k];
      var existing=output.docs[key]&&typeof output.docs[key]==='object'?output.docs[key]:{key:key,groupKey:'equipment'};
      if(byType[key]){
        output.docs[key]=await canonicalDocumentToUi(existing,byType[key]);
      }else if(hasRealAttachment(existing)){
        // 아직 canonical 변환되지 않은 실제 legacy 서류는 임의 삭제하지 않습니다.
        output.docs[key]=existing;
      }else{
        output.docs[key]=blankGhostDoc(existing,key);
      }
    }

    output.sitePassCanonicalHydratedAtV581=new Date().toISOString();
    return output;
  }


  // STEP91 R9B:
  // 최고관리자 회원관리 상세보기 전용 canonical read-only hydration.
  // 기존 회원용 sitepass_get_equipment_detail_v1 / sitepass_has_equipment_access 경계는 변경하지 않는다.
  // 서버는 sitepass_admin_get_equipment_detail_v1에서 active super_admin 세션을 검증한다.
  async function hydrateAdminDocumentState(item,equipmentId){
    if(!item || typeof item!=='object')throw new Error('관리자 상세 대상 장비가 없습니다.');

    var api=window.SitePassSupabaseApi;
    if(!api || typeof api.rpc!=='function')throw new Error('Supabase RPC 연결이 없습니다.');

    var output=clone(item)||{};
    var expectedEquipmentId=clean(
      equipmentId ||
      output.equipmentId ||
      output.equipment_id
    );

    if(!expectedEquipmentId){
      throw new Error('관리자 상세 equipment_id를 확인하지 못했습니다.');
    }

    var detailResult=await api.rpc(
      'sitepass_admin_get_equipment_detail_v1',
      {p_equipment_id:expectedEquipmentId}
    );

    if(detailResult && detailResult.error)throw detailResult.error;

    var detail=parseRpcData(detailResult && detailResult.data);
    if(!detail || typeof detail!=='object'){
      throw new Error('관리자 canonical 장비 상세 결과가 없습니다.');
    }

    if(detail.readOnly!==true){
      throw new Error('관리자 상세 RPC의 readOnly 경계를 확인하지 못했습니다.');
    }

    var equipment=detail.equipment&&typeof detail.equipment==='object'
      ? detail.equipment
      : {};

    if(
      clean(equipment.equipment_id) &&
      clean(equipment.equipment_id)!==expectedEquipmentId
    ){
      throw new Error('관리자 canonical 장비 상세의 equipment_id가 일치하지 않습니다.');
    }

    if(
      clean(equipment.code) &&
      clean(output.code) &&
      clean(equipment.code)!==clean(output.code)
    ){
      throw new Error('관리자 canonical 장비 상세의 code가 일치하지 않습니다.');
    }

    if(clean(equipment.lifecycle_status)!=='active'){
      throw new Error('관리자 최신 상세는 active 장비에서만 표시합니다.');
    }

    output.equipmentId=expectedEquipmentId;
    output.equipment_id=expectedEquipmentId;

    if(clean(equipment.code))output.code=clean(equipment.code);
    if(clean(equipment.equipment_no)){
      output.equipmentNo=clean(equipment.equipment_no);
      output.equipment_no=clean(equipment.equipment_no);
    }
    if(clean(equipment.equipment_name)){
      output.equipmentName=clean(equipment.equipment_name);
      output.equipment_name=clean(equipment.equipment_name);
    }

    output.docs=output.docs&&typeof output.docs==='object'
      ? clone(output.docs)
      : {};

    var canonicalRows=Array.isArray(detail.documents)
      ? detail.documents
      : [];

    var byType={};
    canonicalRows.forEach(function(row){
      var key=clean(row && row.document_type);
      if(key)byType[key]=row;
    });

    for(var k=0;k<EQUIPMENT_DOCUMENT_KEYS.length;k++){
      var key=EQUIPMENT_DOCUMENT_KEYS[k];
      var existing=
        output.docs[key]&&typeof output.docs[key]==='object'
          ? output.docs[key]
          : {key:key,groupKey:'equipment'};

      if(byType[key]){
        output.docs[key]=await canonicalDocumentToUi(
          existing,
          byType[key],
          {failClosedPrivate:true}
        );
      }else{
        // 관리자 canonical 조회에서는 현재 서버 document가 없는 legacy URL을
        // 임의 fallback하지 않는다. 오래된 public URL 노출 대신 빈 상태로 fail-closed.
        output.docs[key]=blankGhostDoc(existing,key);
      }
    }

    output.sitePassAdminCanonicalHydratedAtV91=
      new Date().toISOString();

    return output;
  }

  function newRenewalPages(doc){
    return (doc && Array.isArray(doc.pages)?doc.pages:[]).filter(function(page){
      return !!(page && page.sitePassRenewalNew===true);
    });
  }

  function getActiveRenewalPlan(oldItem,newItem){
    oldItem=oldItem&&typeof oldItem==='object'?oldItem:{};
    newItem=newItem&&typeof newItem==='object'?newItem:{};
    var oldDocs=oldItem.docs&&typeof oldItem.docs==='object'?oldItem.docs:{};
    var newDocs=newItem.docs&&typeof newItem.docs==='object'?newItem.docs:{};
    var changed=[];
    var cleared=[];
    var dateOnly=[];
    var otherDocumentChanges=[];

    EQUIPMENT_DOCUMENT_KEYS.forEach(function(key){
      var oldDoc=oldDocs[key]||{};
      var newDoc=newDocs[key]||{};
      var pages=newRenewalPages(newDoc);
      if(pages.length){
        changed.push({key:key,oldDoc:oldDoc,newDoc:newDoc,pages:pages});
      }else if(newDoc.sitePassRenewalCleared===true && hasRealAttachment(oldDoc)){
        cleared.push(key);
      }else if(
        clean(oldDoc.expireDate)!==clean(newDoc.expireDate) &&
        hasRealAttachment(oldDoc)
      ){
        dateOnly.push(key);
      }
    });

    Object.keys(newDocs).forEach(function(key){
      if(EQUIPMENT_DOCUMENT_KEYS.indexOf(key)>=0)return;
      var doc=newDocs[key]||{};
      if(newRenewalPages(doc).length || doc.sitePassRenewalCleared===true){
        otherDocumentChanges.push(key);
      }
    });

    return {
      changed:changed,
      cleared:cleared,
      dateOnly:dateOnly,
      otherDocumentChanges:otherDocumentChanges
    };
  }

  function pageSource(page){
    page=page&&typeof page==='object'?page:{};
    return [
      page.previewDataUrl,
      page.editDataUrl,
      page.correctedDataUrl,
      page.originalDataUrl,
      page.fileDataUrl,
      page.dataUrl,
      page.fileObjectUrl,
      page.blobUrl
    ].map(clean).find(function(value){
      return /^data:/i.test(value) || /^blob:/i.test(value);
    }) || '';
  }

  async function sourceToBlob(value){
    var source=clean(value);
    if(!source)return null;
    var response=await fetch(source);
    if(!response || !response.ok)throw new Error('새 서류 파일 데이터를 읽지 못했습니다.');
    return await response.blob();
  }

  async function prepareLocalFiles(pages){
    var output=[];
    for(var i=0;i<pages.length;i++){
      var page=pages[i]||{};
      var source=pageSource(page);
      if(!source)throw new Error('새로 선택한 서류 원본 데이터가 없습니다. 파일을 다시 선택해주세요.');
      var blob=await sourceToBlob(source);
      if(!blob || !blob.size)throw new Error('새로 선택한 서류 파일 크기를 확인하지 못했습니다.');
      if(blob.size>20971520)throw new Error('서류 파일은 20MB 이하만 업로드할 수 있습니다.');
      var mime=normalizeMime(blob.type || page.fileType,page.fileName);
      if(ALLOWED_MIME.indexOf(mime)<0)throw new Error('허용되지 않는 서류 형식입니다: '+(mime||'확인불가'));
      output.push({
        pageNo:i+1,
        page:page,
        blob:blob,
        mimeType:mime,
        originalFileName:clean(page.fileName)||('document_'+(i+1)),
        fileSizeBytes:Number(blob.size)
      });
    }
    return output;
  }

  async function cleanupPreparedRenewal(versionId,targets){
    var api=window.SitePassSupabaseApi;
    var result={storageRemoved:false,dbAborted:false,error:''};
    var rows=Array.isArray(targets)?targets:[];
    try{
      var client=api&&typeof api.getClient==='function'?api.getClient():null;
      if(!client || !client.storage || typeof client.storage.from!=='function'){
        throw new Error('Storage cleanup client 없음');
      }
      var byBucket={};
      rows.forEach(function(row){
        var bucket=clean(row && row.storage_bucket);
        var path=clean(row && row.storage_path).replace(/^\/+/,'');
        if(!bucket || !path)return;
        if(!byBucket[bucket])byBucket[bucket]=[];
        byBucket[bucket].push(path);
      });
      var buckets=Object.keys(byBucket);
      for(var i=0;i<buckets.length;i++){
        var bucket=buckets[i];
        var removed=await client.storage.from(bucket).remove(byBucket[bucket]);
        if(removed && removed.error)throw removed.error;
      }
      result.storageRemoved=true;

      if(versionId){
        var aborted=await api.rpc(
          'sitepass_abort_active_equipment_document_renewal_v1',
          {p_version_id:versionId}
        );
        if(aborted && aborted.error)throw aborted.error;
        result.dbAborted=true;
      }
    }catch(error){
      result.error=clean(error && error.message || error);
    }
    return result;
  }

  async function persistActiveEquipmentRenewal(oldItem,newItem,reason,progress){
    var plan=getActiveRenewalPlan(oldItem,newItem);

    if(plan.cleared.length){
      return {
        handled:true,ok:false,writes:0,
        reason:'canonical-document-delete-not-supported',
        error:'현재 서류를 단독 삭제하는 기능은 V5 갱신 범위가 아닙니다. 새 서류로 교체하거나 취소해주세요.'
      };
    }

    if(plan.dateOnly.length){
      return {
        handled:true,ok:false,writes:0,
        reason:'date-only-renewal-blocked',
        error:'서류 갱신과 다른 서류의 날짜 변경을 한 번에 저장하지 않습니다. 날짜를 바꾸는 서류는 새 파일과 함께 별도로 갱신해주세요.'
      };
    }

    if(plan.otherDocumentChanges && plan.otherDocumentChanges.length){
      return {
        handled:true,ok:false,writes:0,
        reason:'mixed-other-document-change',
        error:'장비서류 갱신과 기사/인부 등 다른 서류 변경을 한 번에 저장하지 않습니다. 서류별로 따로 저장해주세요.'
      };
    }

    if(!plan.changed.length){
      return {handled:false,ok:false,writes:0,reason:'no-active-document-renewal'};
    }

    if(plan.changed.length!==1){
      return {
        handled:true,ok:false,writes:0,
        reason:'one-document-per-renewal',
        error:'서류 갱신은 데이터 독립성을 위해 한 번에 서류 1종만 저장해주세요.'
      };
    }

    if(clean(oldItem && oldItem.equipmentName)!==clean(newItem && newItem.equipmentName)){
      return {
        handled:true,ok:false,writes:0,
        reason:'mixed-equipment-field-change',
        error:'서류 갱신과 장비명 수정은 동시에 저장하지 않습니다. 서류 갱신을 먼저 완료한 뒤 장비명을 별도로 수정해주세요.'
      };
    }

    var target=plan.changed[0];
    var api=window.SitePassSupabaseApi;
    if(!api || typeof api.rpc!=='function' || typeof api.storageUpload!=='function'){
      return {handled:true,ok:false,writes:0,reason:'supabase-api-missing',error:'Supabase 문서 갱신 API 연결이 없습니다.'};
    }

    var equipmentId=await resolveEquipmentId(newItem);
    if(!equipmentId){
      return {handled:true,ok:false,writes:0,reason:'equipment-id-missing',error:'장비 equipment_id를 확인하지 못했습니다.'};
    }

    var preparedVersionId='';
    var uploadTargets=[];
    var verified=false;

    try{
      if(typeof progress==='function')progress(5,'새 서류 검증중');
      var localFiles=await prepareLocalFiles(target.pages);
      var filesPayload=localFiles.map(function(file){
        return {
          page_no:file.pageNo,
          mime_type:file.mimeType,
          original_file_name:file.originalFileName,
          file_size_bytes:file.fileSizeBytes
        };
      });

      var expectedCurrent=clean(target.oldDoc && target.oldDoc.canonicalCurrentVersionId) || null;
      var expiry=clean(target.newDoc && target.newDoc.expireDate) || null;

      if(typeof progress==='function')progress(15,'서버 갱신경로 준비중');
      var prepared=await api.rpc(
        'sitepass_prepare_active_equipment_document_renewal_v1',
        {
          p_equipment_id:equipmentId,
          p_document_type:target.key,
          p_files:filesPayload,
          p_expiry_date:expiry,
          p_expected_current_version_id:expectedCurrent
        }
      );
      if(prepared && prepared.error)throw prepared.error;
      var preparedData=parseRpcData(prepared && prepared.data);
      if(!preparedData || preparedData.ok!==true)throw new Error('active 서류 갱신 준비 RPC가 완료되지 않았습니다.');

      preparedVersionId=clean(preparedData.version_id);
      uploadTargets=Array.isArray(preparedData.upload_targets)?preparedData.upload_targets:[];
      if(!preparedVersionId || uploadTargets.length!==localFiles.length){
        throw new Error('canonical 업로드 경로 수가 새 파일 수와 일치하지 않습니다.');
      }

      var targetByPage={};
      uploadTargets.forEach(function(row){targetByPage[Number(row.page_no)]=row;});

      for(var i=0;i<localFiles.length;i++){
        var local=localFiles[i];
        var serverTarget=targetByPage[local.pageNo];
        if(!serverTarget)throw new Error('page '+local.pageNo+' canonical 업로드 경로가 없습니다.');
        if(typeof progress==='function')progress(20+Math.round((i/localFiles.length)*55),'새 서류 업로드 '+(i+1)+'/'+localFiles.length);
        var uploaded=await api.storageUpload(
          clean(serverTarget.storage_bucket),
          clean(serverTarget.storage_path),
          local.blob,
          {
            upsert:false,
            cacheControl:'31536000',
            contentType:local.mimeType
          }
        );
        if(uploaded && uploaded.error)throw uploaded.error;
      }

      if(typeof progress==='function')progress(82,'서버 실제파일 검증중');
      var verify=await api.rpc(
        'sitepass_verify_active_equipment_document_renewal_v1',
        {
          p_version_id:preparedVersionId,
          p_expected_current_version_id:expectedCurrent
        }
      );
      if(verify && verify.error)throw verify.error;
      var verifyData=parseRpcData(verify && verify.data);
      if(!verifyData || verifyData.ok!==true)throw new Error('active 서류 갱신 검증 RPC가 완료되지 않았습니다.');
      verified=true;

      if(typeof progress==='function')progress(92,'현재서류 다시 확인중');
      var hydrated=null;
      var postVerifyHydrationError='';
      try{
        hydrated=await hydrateActiveDocumentState(newItem);
        if(typeof window.sitePassHydrateItemStorageAccessUrlsV523==='function'){
          hydrated=await window.sitePassHydrateItemStorageAccessUrlsV523(hydrated,true);
        }
      }catch(hydrationError){
        postVerifyHydrationError=clean(
          hydrationError && hydrationError.message || hydrationError
        );
        hydrated=clone(newItem)||{};
      }
      hydrated.storageVerifiedCount=localFiles.length;
      hydrated.storageUploadCount=localFiles.length;
      hydrated.sitePassActiveRenewalResult={
        documentType:target.key,
        previousCurrentVersionId:clean(verifyData.previous_current_version_id || expectedCurrent),
        currentVersionId:clean(verifyData.current_version_id || preparedVersionId),
        oldStoragePhysicallyDeleted:false,
        oldHistoryPreserved:true,
        postVerifyHydrationError:postVerifyHydrationError
      };
      if(typeof progress==='function')progress(100,'서류 갱신 완료');
      return {
        handled:true,
        ok:true,
        writes:1,
        item:hydrated,
        documentType:target.key,
        versionId:preparedVersionId,
        previousCurrentVersionId:clean(verifyData.previous_current_version_id || expectedCurrent),
        postVerifyHydrationError:postVerifyHydrationError
      };
    }catch(error){
      var cleanup={storageRemoved:false,dbAborted:false,error:''};
      if(preparedVersionId && !verified){
        cleanup=await cleanupPreparedRenewal(preparedVersionId,uploadTargets);
      }
      return {
        handled:true,
        ok:false,
        writes:0,
        reason:'active-renewal-failed',
        error:error,
        preparedVersionId:preparedVersionId,
        cleanup:cleanup,
        verified:verified
      };
    }
  }

  var api={
    handleFileChange:function(event){
      var target=event&&event.target;
      if(!target||!target.files)return {ok:false,reason:'invalid-file-event',writes:0};
      return need('handleFileChange')(event);
    },

    persistEquipmentDocuments:function(item,reason,progress){
      if(!item||typeof item!=='object')return Promise.resolve({ok:false,reason:'invalid-item',writes:0});
      return need('uploadAndPersistEquipmentItemDocsInBackground')(item,reason,progress);
    },

    persistActiveEquipmentRenewal:persistActiveEquipmentRenewal,
    hydrateActiveDocumentState:hydrateActiveDocumentState,
    hydrateAdminDocumentState:hydrateAdminDocumentState,
    getActiveRenewalPlan:getActiveRenewalPlan,
    hasRealAttachment:hasRealAttachment,

    getCapabilities:function(){
      return {
        fileSelection:typeof window.handleFileChange==='function',
        persist:typeof window.uploadAndPersistEquipmentItemDocsInBackground==='function',
        activeRenewal:true,
        canonicalHydration:true,
        realAttachmentBoundary:true
      };
    }
  };

  window.SitePassDocumentUpload=Object.freeze(api);
})();
