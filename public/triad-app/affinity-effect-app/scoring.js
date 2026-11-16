/* BuyFacts Affinity Wave - transparent prototype arithmetic; NOT validated scoring. */
(function(root,factory){ const api=factory();if(typeof module !== 'undefined' && module.exports) module.exports=api;root.AffinityScoring=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const corners=['ll','lr','apex'];
  const groups=['Perception|Emotive','Perception|Practical','Experience|Emotive','Experience|Practical'];
  const finite=(n)=>typeof n==='number' && Number.isFinite(n);
  function getGroupWeights(res){let g=res.group_shares;for(let a of ['Perception','Experience']){if(!g[a]||!Number.isInteger(g[a].Emotive)||!Number.isInteger(g[a].Practical)||g[a].Emotive<0||g[a].Practical<0||g[a].Emotive+g[a].Practical!==100)throw Error(a+' group shares must total 100');}}
  function calculate(record,instrument){
    if(!record||!record.responses||!record.group_shares||!record.area_shares)throw Error('Incomplete assessment');
    getGroupWeights(record);
    let areas=record.area_shares;
    if(!Number.isInteger(areas.Perception)||!Number.isInteger(areas.Experience)||areas.Perception<0||areas.Experience<0||areas.Perception+areas.Experience!==100)throw Error('Area shares must total 100');
    let groupResults={},drivers=[];
    for(const t of instrument.triads){
      const r=record.responses[t.id]; if(!r||!corners.includes(r.corner)||!Number.isInteger(r.weight)||r.weight<1||r.weight>100)throw Error('Invalid element/weight: '+t.id);
      const pts=instrument.point_maps[t.polarity][r.corner],factor=r.weight/100,weighted=pts*factor;
      drivers.push({id:t.id,area:t.area,kind:t.kind,driver:t.driver,element:r.corner,element_label:t.corners[r.corner],points:pts,weight:r.weight,driver_factor:factor,weighted_driver_value:weighted});
      const g=t.area+'|'+t.kind; if(!groupResults[g])groupResults[g]={sum_weighted:0,sum_factors:0,drivers:[]};
      groupResults[g].sum_weighted+=weighted;groupResults[g].sum_factors+=factor;groupResults[g].drivers.push(t.id);
    }
    for(const g of groups){const v=groupResults[g];if(!v||v.sum_factors<=0)throw Error('Group needs drivers: '+g);v.group_score=v.sum_weighted/v.sum_factors;}
    const areaResults={};
    for(let a of ['Perception','Experience']){
      const emotive=groupResults[a+'|Emotive'].group_score;const practical=groupResults[a+'|Practical'].group_score;
      const eFactor=record.group_shares[a].Emotive/100,pFactor=record.group_shares[a].Practical/100;
      const score=emotive*eFactor+practical*pFactor;
      areaResults[a]={emotive,practical,emotive_factor:eFactor,practical_factor:pFactor,area_score:score,area_factor:record.area_shares[a]/100,area_subscore:score*record.area_shares[a]/100};
    }
    let category_index=areaResults.Perception.area_subscore+areaResults.Experience.area_subscore;
    return {participant_id:record.participant_id,wave_id:record.wave_id,category_index,areas:areaResults,groups:groupResults,drivers};
  }
  function cohortWave(records,instrument){
    const results=records.map(r=>calculate(r,instrument));
    const avg=(arr)=>arr.reduce((s,v)=>s+v,0)/arr.length;
    const driver_summaries=instrument.triads.map(t=>{
       const vals=results.map(r=>r.drivers.find(d=>d.id===t.id));
       return {id:t.id,driver:t.driver,group:t.area+' / '+t.kind,mean_weight:avg(vals.map(x=>x.weight)),mean_points:avg(vals.map(x=>x.points)),corner_counts:{ll:vals.filter(x=>x.element==='ll').length,lr:vals.filter(x=>x.element==='lr').length,apex:vals.filter(x=>x.element==='apex').length}};
    });
    return {n:results.length,mean_category_index:avg(results.map(r=>r.category_index)),mean_perception:avg(results.map(r=>r.areas.Perception.area_score)),mean_experience:avg(results.map(r=>r.areas.Experience.area_score)),driver_summaries,results};
  }
  return {calculate,cohortWave};
});
