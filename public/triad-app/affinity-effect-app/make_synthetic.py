import json, random, pathlib, copy
p=pathlib.Path(__file__).parent
ins=json.loads((p/'triad_instrument.json').read_text());random.seed(190913)
roles=['Marketing','Operations','IT / Development','Finance','Revenue / Sales']
waves=[('2026-Q2','2026-04-01','2026-04-14'),('2026-Q3','2026-07-01','2026-07-14'),('2026-Q4','2026-10-07','2026-10-20')]
data=[]
for wi,(wid,start,end) in enumerate(waves):
 for i in range(1,51):
  pid=f'SYN-{i:03d}';role=roles[(i-1)%len(roles)];r={}
  for j,t in enumerate(ins['triads']):
   random.seed(i*100+j*7+wi*23)
   choice=random.choices(['ll','lr','apex'],weights=[15,60,25])[0]
   weight=random.randint(35,90)
   if t['id']=='perception_practical_fit':
    # An illustrative deteriorating evaluation alongside increased importance.
    choice=random.choices(['ll','lr','apex'],weights=[[4,27,69],[15,65,20],[73,23,4]][wi])[0]
    weight=min(100,random.randint(53,66)+wi*15)
   r[t['id']]={'corner':choice,'weight':weight}
  em=[random.randint(35,55),random.randint(30,50)]
  record={'participant_id':pid,'cohort_id':'SYN-MARKETING-AUTOMATION-50','role':role,'wave_id':wid,'assessment_window':{'start':start,'end':end},'completed_on':[start, '2026-07-09', '2026-10-13'][wi], 'responses':r,'group_shares':{'Perception':{'Emotive':em[0],'Practical':100-em[0]},'Experience':{'Emotive':em[1],'Practical':100-em[1]}},'area_shares':{'Perception':random.randint(45,60),'Experience':0}}
  record['area_shares']['Experience']=100-record['area_shares']['Perception']
  data.append(record)
book=[]
base=next(r for r in data if r['participant_id']=='SYN-001' and r['wave_id']=='2026-Q2')
for wi,(wid,start,end) in enumerate(waves):
 b=copy.deepcopy(base)
 b.update(participant_id='BOOK-EXAMPLE',wave_id=wid,assessment_window={'start':start,'end':end},completed_on=start,role='Marketing')
 b['responses']['perception_practical_fit']={'corner':['apex','lr','ll'][wi],'weight':[60,75,90][wi]}
 b['group_shares']={'Perception':{'Emotive':40,'Practical':60},'Experience':{'Emotive':35,'Practical':65}}
 b['area_shares']={'Perception':55,'Experience':45}
 book.append(b)
(p/'worked_book_scenario.json').write_text(json.dumps({'notice':'SYNTHETIC BOOK EXAMPLE ONLY','assessments':book},indent=2))
(p/'synthetic_assessments.json').write_text(json.dumps({'book_example':book,'notice':'ENTIRELY SYNTHETIC. Not field research or validated findings.','cohort':'SYN-MARKETING-AUTOMATION-50','category':'Marketing Automation Platform','participants':50,'waves':[{'id':x[0],'open':x[1],'close':x[2]} for x in waves],'assessments':data},indent=2))
(p/'synthetic_data.js').write_text('window.SYNTHETIC_DATA='+json.dumps(json.loads((p/'synthetic_assessments.json').read_text()))+';\n')
(p/'instrument_data.js').write_text('window.TRIAD_INSTRUMENT='+json.dumps(ins)+';\n')
print('Generated',len(data),'assessments')
