const fs=require('fs');const assert=require('assert');const sc=require('./scoring');
const ins=JSON.parse(fs.readFileSync(__dirname+'/triad_instrument.json'));
const dt=JSON.parse(fs.readFileSync(__dirname+'/synthetic_assessments.json'));
assert.equal(ins.triads.length,16);
assert.equal(dt.assessments.length,150);
const score=sc.calculate(dt.assessments[0],ins);assert(score.category_index>=33 && score.category_index<=99);
assert.equal(score.drivers.length,16);assert.equal(Object.keys(score.groups).length,4);
for(const grp of Object.values(score.groups)){assert(grp.group_score>=33&&grp.group_score<=99)}
const copy=JSON.parse(JSON.stringify(dt.assessments[0]));copy.responses[ins.triads[0].id].weight=101;
assert.throws(()=>sc.calculate(copy,ins));
const waves=dt.waves.map(w=>sc.cohortWave(dt.assessments.filter(r=>r.wave_id===w.id),ins));
for(const x of waves) assert.equal(x.n,50);
console.log(JSON.stringify({pass:true,number_triads:ins.triads.length,respondents:50,waves:3,assessments:150,mean_index_per_wave:waves.map(w=>Number(w.mean_category_index.toFixed(2))),fit_driver_mean_sentiment:waves.map(w=>Number(w.driver_summaries.find(d=>d.id==='perception_practical_fit').mean_points.toFixed(1)))}));
