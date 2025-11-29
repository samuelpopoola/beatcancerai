-- Seed demo doctors for video consultations
insert into doctors (name, specialty, experience_years, consultation_fee, video_consultation)
select 'Adebayo Johnson', 'Oncology Specialist', 12, 15000, true
where not exists (select 1 from doctors where name = 'Adebayo Johnson');

insert into doctors (name, specialty, experience_years, consultation_fee, video_consultation)
select 'Chinwe Okoro', 'Radiation Oncology', 8, 12000, true
where not exists (select 1 from doctors where name = 'Chinwe Okoro');
