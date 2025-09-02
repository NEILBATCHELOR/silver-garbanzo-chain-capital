/**
 * Test script for ApprovalConfigService debugging
 * Run with: node test-approval-config-service.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrwfkxfzsnnjppogthaw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZreGZ6c25uanBwb2d0aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTE3MzI5NTEsImV4cCI6MjAyNzMwODk1MX0.Vh4XAp2dyfbBOcQQ_W8lkvFglr3AQQlCt-6oGW72aR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApprovalConfigService() {
  console.log('🔍 Testing ApprovalConfigService queries...\n');
  
  try {
    console.log('1️⃣ Testing basic approval_configs query...');
    const { data: basicData, error: basicError } = await supabase
      .from('approval_configs')
      .select('*')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (basicError) {
      console.error('❌ Basic query error:', basicError);
    } else {
      console.log('✅ Basic query success:', {
        recordCount: basicData?.length || 0,
        records: basicData?.map(r => ({
          id: r.id,
          config_name: r.config_name,
          config_description: r.config_description,
          active: r.active
        }))
      });
    }

    console.log('\n2️⃣ Testing approval_configs_with_approvers view...');
    const { data: viewData, error: viewError } = await supabase
      .from('approval_configs_with_approvers')
      .select('*')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (viewError) {
      console.error('❌ View query error:', viewError);
    } else {
      console.log('✅ View query success:', {
        recordCount: viewData?.length || 0,
        firstRecord: viewData?.[0] ? {
          id: viewData[0].id,
          config_name: viewData[0].config_name,
          approver_count: viewData[0].approver_count,
          configured_approvers: typeof viewData[0].configured_approvers
        } : 'No records'
      });
    }

    console.log('\n3️⃣ Testing LIKE query with redemption filter...');
    const { data: likeData, error: likeError } = await supabase
      .from('approval_configs')
      .select('*')
      .like('config_description', '%redemption%')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (likeError) {
      console.error('❌ LIKE query error:', likeError);
    } else {
      console.log('✅ LIKE query success:', {
        recordCount: likeData?.length || 0,
        records: likeData?.map(r => ({
          config_name: r.config_name,
          config_description: r.config_description
        }))
      });
    }

    console.log('\n4️⃣ Testing LIKE query with approval filter...');
    const { data: approvalData, error: approvalError } = await supabase
      .from('approval_configs')
      .select('*')
      .like('config_description', '%approval%')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (approvalError) {
      console.error('❌ Approval LIKE query error:', approvalError);
    } else {
      console.log('✅ Approval LIKE query success:', {
        recordCount: approvalData?.length || 0,
        records: approvalData?.map(r => ({
          config_name: r.config_name,
          config_description: r.config_description
        }))
      });
    }

    console.log('\n5️⃣ Testing join query with approvers...');
    const { data: joinData, error: joinError } = await supabase
      .from('approval_configs')
      .select(`
        *,
        approval_config_approvers (
          *,
          approver_user:users!approval_config_approvers_approver_user_id_fkey(id, name, email),
          approver_role:roles!approval_config_approvers_approver_role_id_fkey(id, name)
        )
      `)
      .eq('active', true)
      .limit(1);

    if (joinError) {
      console.error('❌ Join query error:', joinError);
    } else {
      console.log('✅ Join query success:', {
        recordCount: joinData?.length || 0,
        firstRecordApprovers: joinData?.[0]?.approval_config_approvers?.length || 0,
        approverStructure: joinData?.[0]?.approval_config_approvers?.[0] ? Object.keys(joinData[0].approval_config_approvers[0]) : 'No approvers'
      });
    }

  } catch (error) {
    console.error('💥 Test script error:', error);
  }

  console.log('\n✨ Test completed!');
}

testApprovalConfigService();
