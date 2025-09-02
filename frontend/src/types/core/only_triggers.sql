    CREATE TRIGGER %I_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON %I
    FOR EACH ROW EXECUTE FUNCTION log_database_changes();
  ', table_name, table_name, table_name, table_name);
END;
$$;
--
      EXECUTE 'CREATE TRIGGER ' || trigger_name || 
              ' AFTER INSERT OR UPDATE OR DELETE ON ' || table_name || 
              ' FOR EACH ROW ' || trigger_condition || 
              ' EXECUTE FUNCTION log_table_change()';
              
      -- We'll skip logging to avoid circular dependencies
--
  -- Create trigger with condition
  EXECUTE 'CREATE TRIGGER ' || v_trigger_name || 
          ' AFTER INSERT OR UPDATE OR DELETE ON ' || p_table || 
          ' FOR EACH ROW' || v_condition || 
          ' EXECUTE FUNCTION log_table_change()';
          
  RAISE NOTICE 'Created selective trigger on high-volume table %', p_table;
--
CREATE TRIGGER after_distribution_redemption_insert AFTER INSERT ON public.distribution_redemptions FOR EACH ROW EXECUTE FUNCTION public.update_distribution_remaining_amount();


--
-- Name: token_allocations after_token_allocation_distributed; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER after_token_allocation_distributed AFTER UPDATE ON public.token_allocations FOR EACH ROW WHEN (((old.distributed = false) AND (new.distributed = true))) EXECUTE FUNCTION public.handle_token_distribution();


--
-- Name: approval_config_approvers approval_config_approvers_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER approval_config_approvers_audit_trigger AFTER INSERT OR DELETE ON public.approval_config_approvers FOR EACH ROW EXECUTE FUNCTION public.log_approver_assignment_changes();


--
-- Name: approval_configs approval_config_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER approval_config_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.approval_configs FOR EACH ROW EXECUTE FUNCTION public.log_approval_config_changes();


--
-- Name: audit_logs audit_audit_logs_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER audit_audit_logs_trigger AFTER INSERT OR DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

ALTER TABLE public.audit_logs DISABLE TRIGGER audit_audit_logs_trigger;


--
--
CREATE TRIGGER audit_bulk_operations_trigger AFTER INSERT OR DELETE OR UPDATE ON public.bulk_operations FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

ALTER TABLE public.bulk_operations DISABLE TRIGGER audit_bulk_operations_trigger;


--
--
CREATE TRIGGER audit_notifications_trigger AFTER INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

ALTER TABLE public.notifications DISABLE TRIGGER audit_notifications_trigger;


--
--
CREATE TRIGGER audit_projects_trigger AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

ALTER TABLE public.projects DISABLE TRIGGER audit_projects_trigger;


--
--
CREATE TRIGGER audit_users_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

ALTER TABLE public.users DISABLE TRIGGER audit_users_trigger;


--
--
CREATE TRIGGER before_token_allocation_delete BEFORE DELETE ON public.token_allocations FOR EACH ROW EXECUTE FUNCTION public.handle_token_allocation_deletion();


--
-- Name: tokens create_token_version_on_insert; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER create_token_version_on_insert AFTER INSERT ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.create_token_version();


--
-- Name: tokens create_token_version_on_update; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER create_token_version_on_update AFTER UPDATE ON public.tokens FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION public.create_token_version();


--
-- Name: distributions distributions_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER distributions_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.distributions FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.distributions DISABLE TRIGGER distributions_audit_trigger;


--
--
CREATE TRIGGER document_expiry_trigger AFTER INSERT OR UPDATE OF expiry_date ON public.documents FOR EACH ROW EXECUTE FUNCTION public.check_document_expiry();


--
-- Name: documents document_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER document_version_trigger BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.create_document_version();


--
-- Name: audit_logs extract_metadata_values_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER extract_metadata_values_trigger BEFORE INSERT OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.extract_severity_from_metadata();


--
-- Name: investor_approvals investor_approval_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER investor_approval_audit_trigger AFTER UPDATE ON public.investor_approvals FOR EACH ROW EXECUTE FUNCTION public.audit_investor_approval_changes();

ALTER TABLE public.investor_approvals DISABLE TRIGGER investor_approval_audit_trigger;


--
--
CREATE TRIGGER investors_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.investors DISABLE TRIGGER investors_audit_trigger;


--
--
CREATE TRIGGER log_distribution_changes AFTER INSERT OR DELETE OR UPDATE ON public.distributions FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: distribution_redemptions log_distribution_redemption_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_distribution_redemption_changes AFTER INSERT OR DELETE OR UPDATE ON public.distribution_redemptions FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: investors log_investor_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_investor_changes AFTER INSERT OR DELETE OR UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: redemption_requests log_redemption_request_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_redemption_request_changes AFTER INSERT OR DELETE OR UPDATE ON public.redemption_requests FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: subscriptions log_subscription_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_subscription_changes AFTER INSERT OR DELETE OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: token_allocations log_token_allocation_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_token_allocation_changes AFTER INSERT OR DELETE OR UPDATE ON public.token_allocations FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: tokens log_token_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_token_changes AFTER INSERT OR DELETE OR UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: token_templates log_token_template_changes; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER log_token_template_changes AFTER INSERT OR DELETE OR UPDATE ON public.token_templates FOR EACH ROW EXECUTE FUNCTION public.log_user_action();


--
-- Name: policy_templates policy_templates_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER policy_templates_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.policy_templates FOR EACH ROW EXECUTE FUNCTION public.log_user_action();

ALTER TABLE public.policy_templates DISABLE TRIGGER policy_templates_audit_trigger;


--
--
CREATE TRIGGER projects_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.projects DISABLE TRIGGER projects_audit_trigger;


--
--
CREATE TRIGGER redemption_approvers_updated_at BEFORE UPDATE ON public.redemption_approvers FOR EACH ROW EXECUTE FUNCTION public.update_redemption_approvers_updated_at();


--
-- Name: redemption_requests redemption_requests_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER redemption_requests_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.redemption_requests FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.redemption_requests DISABLE TRIGGER redemption_requests_audit_trigger;


--
--
CREATE TRIGGER rule_approval_trigger BEFORE INSERT OR UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public.add_rule_to_approval_queue();


--
-- Name: rules rules_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER rules_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public.log_user_action();

ALTER TABLE public.rules DISABLE TRIGGER rules_audit_trigger;


--
--
CREATE TRIGGER rules_update_timestamp BEFORE UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public.update_rules_updated_at();


--
-- Name: distributions set_standard_on_distribution_insert; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_standard_on_distribution_insert BEFORE INSERT ON public.distributions FOR EACH ROW EXECUTE FUNCTION public.set_distribution_standard();


--
-- Name: distributions set_standard_on_distribution_update; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_standard_on_distribution_update BEFORE UPDATE ON public.distributions FOR EACH ROW WHEN (((old.standard IS DISTINCT FROM new.standard) AND (new.standard IS NULL))) EXECUTE FUNCTION public.set_distribution_standard();


--
-- Name: token_allocations set_standard_on_token_allocation_insert; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_standard_on_token_allocation_insert BEFORE INSERT ON public.token_allocations FOR EACH ROW EXECUTE FUNCTION public.set_token_allocation_standard();


--
-- Name: token_allocations set_standard_on_token_allocation_update; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_standard_on_token_allocation_update BEFORE UPDATE ON public.token_allocations FOR EACH ROW WHEN (((old.token_id IS DISTINCT FROM new.token_id) OR (new.standard IS NULL))) EXECUTE FUNCTION public.set_token_allocation_standard();


--
-- Name: token_whitelists set_token_whitelists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_token_whitelists_updated_at BEFORE UPDATE ON public.token_whitelists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: security_events set_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_timestamp BEFORE UPDATE ON public.security_events FOR EACH ROW EXECUTE FUNCTION public.update_security_events_updated_at();


--
-- Name: token_erc1155_balances set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1155_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1155_properties set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1155_properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1155_types set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1155_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1155_uri_mappings set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1155_uri_mappings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_controllers set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_controllers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_documents set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_partition_balances set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_partition_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_partition_operators set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_partition_operators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_partition_transfers set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_partition_transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_partitions set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_partitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc1400_properties set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc1400_properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc3525_allocations set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc3525_allocations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc3525_properties set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc3525_properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc3525_slots set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc3525_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc4626_asset_allocations set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc4626_asset_allocations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc4626_properties set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc4626_properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc4626_strategy_params set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc4626_strategy_params FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: token_erc721_attributes set_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.token_erc721_attributes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions subscriptions_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER subscriptions_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.subscriptions DISABLE TRIGGER subscriptions_audit_trigger;


--
--
CREATE TRIGGER template_approval_trigger BEFORE INSERT OR UPDATE ON public.policy_templates FOR EACH ROW EXECUTE FUNCTION public.add_template_to_approval_queue();


--
-- Name: token_allocations token_allocations_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER token_allocations_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.token_allocations FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.token_allocations DISABLE TRIGGER token_allocations_audit_trigger;


--
--
CREATE TRIGGER token_insert_trigger AFTER INSERT ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.insert_token_properties();


--
-- Name: tokens tokens_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER tokens_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();

ALTER TABLE public.tokens DISABLE TRIGGER tokens_audit_trigger;


--
--
CREATE TRIGGER trigger_calculate_nav_change BEFORE INSERT OR UPDATE ON public.fund_nav_data FOR EACH ROW EXECUTE FUNCTION public.calculate_nav_change();


--
-- Name: consensus_settings trigger_consensus_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_consensus_settings_updated_at BEFORE UPDATE ON public.consensus_settings FOR EACH ROW EXECUTE FUNCTION public.update_consensus_settings_updated_at();


--
-- Name: investor_groups_investors trigger_update_group_member_count_delete; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_group_member_count_delete AFTER DELETE ON public.investor_groups_investors FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: investor_groups_investors trigger_update_group_member_count_delete_new; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_group_member_count_delete_new AFTER DELETE ON public.investor_groups_investors FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: investor_group_members trigger_update_group_member_count_delete_old; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_group_member_count_delete_old AFTER DELETE ON public.investor_group_members FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: investor_groups_investors trigger_update_group_member_count_insert; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_group_member_count_insert AFTER INSERT ON public.investor_groups_investors FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: investor_groups_investors trigger_update_group_member_count_insert_new; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_group_member_count_insert_new AFTER INSERT ON public.investor_groups_investors FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: investor_group_members trigger_update_group_member_count_insert_old; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_group_member_count_insert_old AFTER INSERT ON public.investor_group_members FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: redemption_settlements trigger_update_settlement_status; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER trigger_update_settlement_status BEFORE UPDATE ON public.redemption_settlements FOR EACH ROW EXECUTE FUNCTION public.update_settlement_status();


--
-- Name: alerts update_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_config_approvers update_approval_config_approvers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_approval_config_approvers_updated_at BEFORE UPDATE ON public.approval_config_approvers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_configs update_approval_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_approval_configs_updated_at BEFORE UPDATE ON public.approval_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_reports update_compliance_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_compliance_reports_updated_at BEFORE UPDATE ON public.compliance_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_activity_logs update_dfns_activity_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_activity_logs_updated_at BEFORE UPDATE ON public.dfns_activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_api_requests update_dfns_api_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_api_requests_updated_at BEFORE UPDATE ON public.dfns_api_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_applications update_dfns_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_applications_updated_at BEFORE UPDATE ON public.dfns_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_broadcast_transactions update_dfns_broadcast_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_broadcast_transactions_updated_at BEFORE UPDATE ON public.dfns_broadcast_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_credentials update_dfns_credentials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_credentials_updated_at BEFORE UPDATE ON public.dfns_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_exchange_accounts update_dfns_exchange_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_exchange_accounts_updated_at BEFORE UPDATE ON public.dfns_exchange_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_exchange_balances update_dfns_exchange_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_exchange_balances_updated_at BEFORE UPDATE ON public.dfns_exchange_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_exchange_integrations update_dfns_exchange_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_exchange_integrations_updated_at BEFORE UPDATE ON public.dfns_exchange_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_fee_sponsors update_dfns_fee_sponsors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_fee_sponsors_updated_at BEFORE UPDATE ON public.dfns_fee_sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_fiat_provider_configs update_dfns_fiat_provider_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_fiat_provider_configs_updated_at BEFORE UPDATE ON public.dfns_fiat_provider_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_fiat_transactions update_dfns_fiat_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_fiat_transactions_updated_at BEFORE UPDATE ON public.dfns_fiat_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_permission_assignments update_dfns_permission_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_permission_assignments_updated_at BEFORE UPDATE ON public.dfns_permission_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_permissions update_dfns_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_permissions_updated_at BEFORE UPDATE ON public.dfns_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_personal_access_tokens update_dfns_personal_access_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_personal_access_tokens_updated_at BEFORE UPDATE ON public.dfns_personal_access_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_policies update_dfns_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_policies_updated_at BEFORE UPDATE ON public.dfns_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_policy_approvals update_dfns_policy_approvals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_policy_approvals_updated_at BEFORE UPDATE ON public.dfns_policy_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_service_accounts update_dfns_service_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_service_accounts_updated_at BEFORE UPDATE ON public.dfns_service_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_signatures update_dfns_signatures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_signatures_updated_at BEFORE UPDATE ON public.dfns_signatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_signing_keys update_dfns_signing_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_signing_keys_updated_at BEFORE UPDATE ON public.dfns_signing_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_sponsored_fees update_dfns_sponsored_fees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_sponsored_fees_updated_at BEFORE UPDATE ON public.dfns_sponsored_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_staking_integrations update_dfns_staking_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_staking_integrations_updated_at BEFORE UPDATE ON public.dfns_staking_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_sync_status update_dfns_sync_status_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_sync_status_updated_at BEFORE UPDATE ON public.dfns_sync_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_transaction_history update_dfns_transaction_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_transaction_history_updated_at BEFORE UPDATE ON public.dfns_transaction_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_transfers update_dfns_transfers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_transfers_updated_at BEFORE UPDATE ON public.dfns_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_users update_dfns_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_users_updated_at BEFORE UPDATE ON public.dfns_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_validators update_dfns_validators_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_validators_updated_at BEFORE UPDATE ON public.dfns_validators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_wallet_balances update_dfns_wallet_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_wallet_balances_updated_at BEFORE UPDATE ON public.dfns_wallet_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_wallet_nfts update_dfns_wallet_nfts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_wallet_nfts_updated_at BEFORE UPDATE ON public.dfns_wallet_nfts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_wallets update_dfns_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_wallets_updated_at BEFORE UPDATE ON public.dfns_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_webhook_deliveries update_dfns_webhook_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_webhook_deliveries_updated_at BEFORE UPDATE ON public.dfns_webhook_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dfns_webhooks update_dfns_webhooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_dfns_webhooks_updated_at BEFORE UPDATE ON public.dfns_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: document_workflows update_document_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_document_workflows_updated_at BEFORE UPDATE ON public.document_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fiat_transactions update_fiat_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_fiat_transactions_updated_at BEFORE UPDATE ON public.fiat_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: health_checks update_health_checks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_health_checks_updated_at BEFORE UPDATE ON public.health_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: investor_approvals update_investor_approvals_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_investor_approvals_timestamp BEFORE UPDATE ON public.investor_approvals FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: investor_groups update_investor_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_investor_groups_updated_at BEFORE UPDATE ON public.investor_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: investors update_investors_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_investors_timestamp BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: investors update_investors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: issuer_access_roles update_issuer_access_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_issuer_access_roles_updated_at BEFORE UPDATE ON public.issuer_access_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: issuer_documents update_issuer_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_issuer_documents_updated_at BEFORE UPDATE ON public.issuer_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_compliance_alerts update_moonpay_compliance_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_compliance_alerts_updated_at BEFORE UPDATE ON public.moonpay_compliance_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_customers update_moonpay_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_customers_updated_at BEFORE UPDATE ON public.moonpay_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_passes update_moonpay_passes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_passes_updated_at BEFORE UPDATE ON public.moonpay_passes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_policies update_moonpay_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_policies_updated_at BEFORE UPDATE ON public.moonpay_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_policy_logs update_moonpay_policy_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_policy_logs_updated_at BEFORE UPDATE ON public.moonpay_policy_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_projects update_moonpay_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_projects_updated_at BEFORE UPDATE ON public.moonpay_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_swap_transactions update_moonpay_swap_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_swap_transactions_updated_at BEFORE UPDATE ON public.moonpay_swap_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_transactions update_moonpay_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_transactions_updated_at BEFORE UPDATE ON public.moonpay_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moonpay_webhook_config update_moonpay_webhook_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_moonpay_webhook_config_updated_at BEFORE UPDATE ON public.moonpay_webhook_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_restrictions update_onboarding_restrictions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_onboarding_restrictions_updated_at BEFORE UPDATE ON public.onboarding_restrictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onchain_identities update_onchain_identities_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_onchain_identities_timestamp BEFORE UPDATE ON public.onchain_identities FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: onchain_issuers update_onchain_issuers_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_onchain_issuers_timestamp BEFORE UPDATE ON public.onchain_issuers FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: organizations update_organizations_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: ramp_network_config update_ramp_network_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_ramp_network_config_updated_at BEFORE UPDATE ON public.ramp_network_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ramp_webhook_events update_ramp_webhook_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_ramp_webhook_events_updated_at BEFORE UPDATE ON public.ramp_webhook_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ripple_payments update_ripple_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_ripple_payments_updated_at BEFORE UPDATE ON public.ripple_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: risk_assessments update_risk_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON public.risk_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stripe_conversion_transactions update_stripe_conversion_transactions_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_stripe_conversion_transactions_updated_at_trigger BEFORE UPDATE ON public.stripe_conversion_transactions FOR EACH ROW EXECUTE FUNCTION public.update_stripe_conversion_transactions_updated_at();


--
-- Name: stripe_stablecoin_accounts update_stripe_stablecoin_accounts_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_stripe_stablecoin_accounts_updated_at_trigger BEFORE UPDATE ON public.stripe_stablecoin_accounts FOR EACH ROW EXECUTE FUNCTION public.update_stripe_stablecoin_accounts_updated_at();


--
-- Name: token_erc1155_properties update_token_erc1155_properties_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_erc1155_properties_timestamp BEFORE UPDATE ON public.token_erc1155_properties FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: token_erc1400_properties update_token_erc1400_properties_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_erc1400_properties_timestamp BEFORE UPDATE ON public.token_erc1400_properties FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: token_erc20_properties update_token_erc20_properties_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_erc20_properties_timestamp BEFORE UPDATE ON public.token_erc20_properties FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: token_erc3525_properties update_token_erc3525_properties_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_erc3525_properties_timestamp BEFORE UPDATE ON public.token_erc3525_properties FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: token_erc4626_properties update_token_erc4626_properties_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_erc4626_properties_timestamp BEFORE UPDATE ON public.token_erc4626_properties FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: token_erc721_properties update_token_erc721_properties_timestamp; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_erc721_properties_timestamp BEFORE UPDATE ON public.token_erc721_properties FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: token_templates update_token_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_token_templates_updated_at BEFORE UPDATE ON public.token_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tokens update_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wallet_transactions update_wallet_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: tokens validate_token_data_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER validate_token_data_trigger BEFORE INSERT OR UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.validate_token_data();


--
-- Name: multi_sig_wallets validate_wallet_address_trigger; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER validate_wallet_address_trigger BEFORE INSERT OR UPDATE ON public.multi_sig_wallets FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_address();


--
-- Name: wallet_signatories wallet_signatories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER wallet_signatories_updated_at BEFORE UPDATE ON public.wallet_signatories FOR EACH ROW EXECUTE FUNCTION public.update_wallet_signatories_updated_at();


--
-- Name: whitelist_entries whitelist_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
--
CREATE TRIGGER whitelist_entries_updated_at BEFORE UPDATE ON public.whitelist_entries FOR EACH ROW EXECUTE FUNCTION public.update_whitelist_entries_updated_at();


--
-- Name: approval_config_approvers approval_config_approvers_approval_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
