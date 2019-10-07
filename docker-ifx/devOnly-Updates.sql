-- THIS SCRIPT SHOULD NOT BE EXECUTED IN PRODUCTION --
DATABASE tcs_catalog;

-- Make sure all users in the db agree to all terms
INSERT INTO user_terms_of_use_xref
SELECT u.user_id, t.terms_of_use_id, CURRENT, CURRENT
FROM user u
JOIN terms_of_use t ON 1=1
LEFT JOIN (SELECT user_id, terms_of_use_id FROM user_terms_of_use_xref) x
ON x.user_id = u.user_id AND x.terms_of_use_id = t.terms_of_use_id
WHERE x.user_id IS NULL;


-- Create some Copilot profiles

-- ksmith
insert into copilot_profile values(1, 124861, 1, 0, 100, current, 't', '132456', current, '132456', current, 't', 't' );

-- wyzmo
insert into copilot_profile values(2, 124856, 1, 0, 100, current, 't', '132456', current, '132456', current, 't', 't' );


-- Create a TC direct project
insert into tc_direct_project(project_id, name, project_status_id, user_id, create_date )
values(3000, 'Test TC Direct Project', 1, 132456, current);

-- Assign two Copilots to TC Direct project (ksmith (id = 124861) and wyzmo (id = 124856))
insert into copilot_project(copilot_project_id, copilot_profile_id, tc_direct_project_id, copilot_type_id, copilot_project_status_id, private_project, create_user, create_date, modify_user, modify_date)
values(6000, 1, 3000, 1, 1, 'N', 132456, current, 132456, current);

insert into copilot_project(copilot_project_id, copilot_profile_id, tc_direct_project_id, copilot_type_id, copilot_project_status_id, private_project, create_user, create_date, modify_user, modify_date)
values(6001, 2, 3000, 1, 1, 'N', 132456, current, 132456, current);

-- Create Copilots permissions ( permission_type_id = 3, means project_full permission)
-- ksmith
insert into user_permission_grant(user_permission_grant_id, user_id, resource_id, permission_type_id)
values(1000, 124861, 3000, 3);
-- wyzmo
insert into user_permission_grant(user_permission_grant_id, user_id, resource_id, permission_type_id)
values(1001, 124856, 3000, 3);

-- Create TC direct permissions for other users

-- handle = 'Hung', Permission type = project_report
insert into user_permission_grant(user_permission_grant_id, user_id, resource_id, permission_type_id)
values(1002, 124764, 3000, 0);

-- handle = 'twight', Permission type = project_read
insert into user_permission_grant(user_permission_grant_id, user_id, resource_id, permission_type_id)
values(1003, 124766, 3000, 1);

-- handle = 'dok_tester', Permission type = project_write
insert into user_permission_grant(user_permission_grant_id, user_id, resource_id, permission_type_id)
values(1004, 20, 3000, 2);
